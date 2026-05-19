import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme, fontFamily } from "../../constants/theme";
import { colors } from "../../theme/colors";
import {
  ALL_WATERFALLS,
  WaterfallWithScore,
  staticScore,
  scoreColor,
  scoreLabel,
  fetchRiverForecast,
} from "../../components/waterfallsData";
import { useTurbines } from "../../contexts/TurbinesContext";

const STYLE_PREF_KEY = "hydrotech_map_style_v3";
const ROUTE_CACHE_KEY = "hydrotech_route_cache_v2";

type StyleId = "plan" | "satellite" | "hybride";
const STYLE_LABELS: Record<StyleId, string> = { plan: "Plan", satellite: "Satellite", hybride: "Hybride" };
const STYLE_ICONS: Record<StyleId, string> = { plan: "🗺", satellite: "🛰", hybride: "🌍" };
const STYLE_NEXT: Record<StyleId, StyleId> = { hybride: "satellite", satellite: "plan", plan: "hybride" };

type RouteOption = {
  mode: "foot" | "car";
  coords: { latitude: number; longitude: number }[];
  distance: string;
  duration: string;
};

async function loadRouteCache(): Promise<Record<string, RouteOption[]>> {
  try {
    const r = await AsyncStorage.getItem(ROUTE_CACHE_KEY);
    return r ? JSON.parse(r) : {};
  } catch { return {}; }
}
async function saveRouteCache(c: Record<string, RouteOption[]>) {
  try { await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

function buildMapHTML(waterfalls: WaterfallWithScore[]): string {
  const wfJson = JSON.stringify(
    waterfalls.map((w) => ({
      id: w.id, name: w.name || "", lat: w.lat, lng: w.lng,
      score: w.score, height: w.height || null, color: scoreColor(w.score),
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
body{background:#090e1a}
.leaflet-control-attribution{background:rgba(9,14,26,0.8)!important;color:#4a5578!important;font-size:9px!important}
.leaflet-control-attribution a{color:#4a5578!important}
.user-outer{width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.25);display:flex;align-items:center;justify-content:center}
.user-inner{width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 0 8px rgba(59,130,246,0.6)}
.t-icon{display:flex;flex-direction:column;align-items:center}
.t-circle{width:34px;height:34px;border-radius:50%;background:#0d1f35;border:2px solid #00d4b4;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px rgba(0,212,180,0.45)}
.t-badge{background:#0d1f35;border:1px solid #00d4b4;border-radius:5px;padding:1px 4px;margin-top:-3px;font-size:8px;color:#00d4b4;font-family:monospace;white-space:nowrap}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false}).setView([46.5,2.35],5.5);
var LAYERS={
  plan:L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; CartoDB',maxZoom:19,subdomains:'abcd'}),
  satellite:L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}',{attribution:'&copy; Google',maxZoom:21,subdomains:['0','1','2','3']}),
  hybride:L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}',{attribution:'&copy; Google',maxZoom:21,subdomains:['0','1','2','3']})
};
var curStyle='hybride';
LAYERS[curStyle].addTo(map);
var wfs=${wfJson};
function scoreR(s){return s>=80?9:s>=60?7:5;}
wfs.forEach(function(wf){
  var m=L.circleMarker([wf.lat,wf.lng],{radius:scoreR(wf.score),fillColor:wf.color,color:'#fff',weight:1.5,opacity:1,fillOpacity:0.9}).addTo(map);
  m.on('click',function(e){L.DomEvent.stopPropagation(e);window.ReactNativeWebView.postMessage(JSON.stringify({type:'wf_tap',id:wf.id}));});
});
var userMarker=null,routeLayer=null,turbineMarkers={};
function onMsg(e){
  try{
    var msg=JSON.parse(e.data);
    if(msg.type==='set_location'){
      var ll=[msg.lat,msg.lng];
      if(!userMarker){var ico=L.divIcon({html:'<div class="user-outer"><div class="user-inner"></div></div>',className:'',iconSize:[24,24],iconAnchor:[12,12]});userMarker=L.marker(ll,{icon:ico,zIndexOffset:1000}).addTo(map);}
      else{userMarker.setLatLng(ll);}
    }
    if(msg.type==='set_style'){map.removeLayer(LAYERS[curStyle]);curStyle=msg.style;LAYERS[curStyle].addTo(map);}
    if(msg.type==='fly_to'){map.flyTo([msg.lat,msg.lng],msg.zoom||14,{duration:0.8});}
    if(msg.type==='fly_to_user'){if(userMarker)map.flyTo(userMarker.getLatLng(),14,{duration:0.8});}
    if(msg.type==='zoom_in'){map.setZoom(map.getZoom()+1);}
    if(msg.type==='zoom_out'){map.setZoom(map.getZoom()-1);}
    if(msg.type==='show_route'){
      if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
      if(msg.coords&&msg.coords.length>1){
        var lls=msg.coords.map(function(c){return[c.latitude,c.longitude];});
        routeLayer=L.polyline(lls,{color:msg.mode==='foot'?'#60a5fa':'#3b82f6',weight:4,opacity:0.85,dashArray:msg.mode==='foot'?'7,9':null}).addTo(map);
        map.fitBounds(routeLayer.getBounds(),{padding:[100,60]});
      }
    }
    if(msg.type==='clear_route'){if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}}
    if(msg.type==='set_turbines'){
      Object.keys(turbineMarkers).forEach(function(id){map.removeLayer(turbineMarkers[id]);});turbineMarkers={};
      (msg.turbines||[]).forEach(function(t){
        if(t.lat==null||t.lng==null)return;
        var ico=L.divIcon({html:'<div class="t-icon"><div class="t-circle">⚡</div><div class="t-badge">'+Math.round(t.power||0)+'W</div></div>',className:'',iconSize:[40,50],iconAnchor:[20,25]});
        turbineMarkers[t.id]=L.marker([t.lat,t.lng],{icon:ico,zIndexOffset:2000}).addTo(map);
      });
    }
  }catch(err){}
}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
map.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_tap'}));});
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const { turbines } = useTurbines();
  const webRef = useRef<WebView>(null);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedWf, setSelectedWf] = useState<WaterfallWithScore | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [forecast, setForecast] = useState<{ rainLast7days: number; impact: string; label: string } | null>(null);
  const [mapStyle, setMapStyle] = useState<StyleId>("hybride");
  const [mapReady, setMapReady] = useState(false);
  const routeCache = useRef<Record<string, RouteOption[]>>({});

  const waterfalls = useMemo<WaterfallWithScore[]>(
    () => ALL_WATERFALLS.map((w) => ({ ...w, score: staticScore(w) })),
    [],
  );

  const mapHTML = useMemo(() => buildMapHTML(waterfalls), [waterfalls]);

  const postMsg = useCallback((obj: object) => {
    webRef.current?.injectJavaScript(
      `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}});window.dispatchEvent(e);})();true;`
    );
  }, []);

  useEffect(() => {
    loadRouteCache().then((c) => { routeCache.current = c; });
    AsyncStorage.getItem(STYLE_PREF_KEY).then((s) => {
      if (s === "plan" || s === "satellite" || s === "hybride") setMapStyle(s as StyleId);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!mapReady || !location) return;
    postMsg({ type: "set_location", lat: location.latitude, lng: location.longitude });
    postMsg({ type: "fly_to", lat: location.latitude, lng: location.longitude, zoom: 12 });
  }, [mapReady, location, postMsg]);

  useEffect(() => {
    if (!mapReady) return;
    postMsg({
      type: "set_turbines",
      turbines: turbines.filter((t) => t.location).map((t) => ({
        id: String(t.id), lat: t.location!.latitude, lng: t.location!.longitude, power: t.power,
      })),
    });
  }, [mapReady, turbines, postMsg]);

  useEffect(() => {
    if (!mapReady) return;
    postMsg({ type: "set_style", style: mapStyle });
  }, [mapReady, mapStyle, postMsg]);

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "wf_tap") {
        const wf = waterfalls.find((w) => w.id === msg.id);
        if (!wf) return;
        setSelectedWf(wf); setRoutes([]); setActiveRoute(null); setForecast(null);
        postMsg({ type: "fly_to", lat: wf.lat, lng: wf.lng, zoom: 14 });
        fetchRiverForecast(wf.lat, wf.lng).then((f) => f && setForecast(f));
        const cacheKey = String(wf.id);
        if (routeCache.current[cacheKey]) { setRoutes(routeCache.current[cacheKey]); return; }
        if (!location) return;
        setRouteLoading(true);
        const fetchRoute = async (mode: "foot" | "car"): Promise<RouteOption | null> => {
          try {
            const url = `https://router.project-osrm.org/route/v1/${mode}/${location.longitude},${location.latitude};${wf.lng},${wf.lat}?overview=full&geometries=geojson`;
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 8000);
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(t);
            const data = await res.json();
            if (data.routes?.length) {
              const r = data.routes[0];
              const coords = r.geometry.coordinates.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
              const km = (r.distance / 1000).toFixed(1);
              const min = Math.round(r.duration / 60);
              const dur = min > 60 ? `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, "0")}` : `${min} min`;
              return { mode, coords, distance: `${km} km`, duration: dur };
            }
          } catch {}
          return null;
        };
        const [foot, car] = await Promise.all([fetchRoute("foot"), fetchRoute("car")]);
        const opts = [foot, car].filter(Boolean) as RouteOption[];
        if (opts.length) { routeCache.current[cacheKey] = opts; saveRouteCache(routeCache.current); }
        setRoutes(opts); setRouteLoading(false);
      }
      if (msg.type === "map_tap") {
        setSelectedWf(null); setRoutes([]); setActiveRoute(null); setForecast(null);
        postMsg({ type: "clear_route" });
      }
    } catch {}
  }, [waterfalls, location, postMsg]);

  const selectRoute = (r: RouteOption) => {
    setActiveRoute(r);
    postMsg({ type: "show_route", mode: r.mode, coords: r.coords });
  };

  const cycleStyle = () => {
    const next = STYLE_NEXT[mapStyle];
    setMapStyle(next);
    AsyncStorage.setItem(STYLE_PREF_KEY, next).catch(() => {});
  };

  const goToMyLocation = async () => {
    if (location) { postMsg({ type: "fly_to_user" }); return; }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    postMsg({ type: "set_location", lat: loc.coords.latitude, lng: loc.coords.longitude });
    postMsg({ type: "fly_to", lat: loc.coords.latitude, lng: loc.coords.longitude, zoom: 14 });
  };

  const closeOverlay = () => {
    setSelectedWf(null); setRoutes([]); setActiveRoute(null); setForecast(null);
    postMsg({ type: "clear_route" });
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: mapHTML }}
        style={StyleSheet.absoluteFillObject}
        onLoad={() => setMapReady(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      {/* HEADER */}
      <View style={styles.headerGlass}>
        <View style={styles.headerLeft}>
          <View style={styles.brandDot} />
          <View>
            <Text style={styles.brandLabel}>CARTE</Text>
            <Text style={styles.brandTitle}>{waterfalls.length} chutes</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.styleBtn} onPress={cycleStyle} activeOpacity={0.7}>
          <Text style={styles.styleIcon}>{STYLE_ICONS[mapStyle]}</Text>
          <Text style={styles.styleLbl}>{STYLE_LABELS[mapStyle]}</Text>
        </TouchableOpacity>
      </View>

      {/* ZOOM */}
      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => postMsg({ type: "zoom_in" })} activeOpacity={0.7}>
          <Text style={styles.ctrlIcon}>+</Text>
        </TouchableOpacity>
        <View style={styles.ctrlSeparator} />
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => postMsg({ type: "zoom_out" })} activeOpacity={0.7}>
          <Text style={styles.ctrlIcon}>−</Text>
        </TouchableOpacity>
      </View>

      {/* LOCATION */}
      <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation} activeOpacity={0.7}>
        <Text style={styles.locIcon}>◎</Text>
      </TouchableOpacity>

      {/* TURBINES STATS */}
      {turbines.length > 0 && !selectedWf && (
        <View style={styles.statsOverlay}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{turbines.length}</Text>
            <Text style={styles.statLbl}>turbine{turbines.length > 1 ? "s" : ""}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{Math.round(turbines.reduce((s, t) => s + t.power, 0))}</Text>
            <Text style={styles.statLbl}>watts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{turbines.reduce((s, t) => s + t.batteries.length, 0)}</Text>
            <Text style={styles.statLbl}>batteries</Text>
          </View>
        </View>
      )}

      {/* BOTTOM SHEET */}
      {selectedWf && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetHeadLeft}>
              <View style={[styles.scorePill, { backgroundColor: scoreColor(selectedWf.score) + "33", borderColor: scoreColor(selectedWf.score) }]}>
                <Text style={[styles.scoreVal, { color: scoreColor(selectedWf.score) }]}>{selectedWf.score}</Text>
                <Text style={styles.scoreLbl}>{scoreLabel(selectedWf.score)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{selectedWf.name || "Chute d'eau"}</Text>
                <Text style={styles.sheetMeta}>
                  {selectedWf.height ? `${selectedWf.height}m · ` : ""}{selectedWf.region} · {selectedWf.lat.toFixed(3)}, {selectedWf.lng.toFixed(3)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeOverlay} activeOpacity={0.6}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {forecast && (
            <View style={styles.forecastRow}>
              <Text style={styles.forecastIcon}>{forecast.impact === "increase" ? "🌧️" : forecast.impact === "decrease" ? "☀️" : "⛅"}</Text>
              <Text style={styles.forecastTxt}>{forecast.label} ({forecast.rainLast7days.toFixed(0)}mm/7j)</Text>
            </View>
          )}

          {routeLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.loadingTxt}>Calcul des itinéraires...</Text>
            </View>
          ) : routes.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingTxt}>{location ? "Itinéraire indisponible" : "Position GPS requise"}</Text>
            </View>
          ) : (
            <View style={styles.routesRow}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.mode}
                  style={[styles.routeBtn, activeRoute?.mode === r.mode && styles.routeBtnActive]}
                  onPress={() => selectRoute(r)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.routeIcon}>{r.mode === "foot" ? "🚶" : "🚗"}</Text>
                  <View style={styles.routeMid}>
                    <Text style={styles.routeMode}>{r.mode === "foot" ? "À pied" : "En voiture"}</Text>
                    <Text style={styles.routeMeta}>{r.distance} · {r.duration}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  headerGlass: {
    position: "absolute", top: 56, left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(9,14,26,0.88)", borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent },
  brandLabel: { fontFamily: fontFamily.semibold, fontSize: 9, letterSpacing: 2, color: theme.textMuted, textTransform: "uppercase" },
  brandTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: theme.textPrimary, marginTop: 1, letterSpacing: -0.3 },
  styleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: theme.accent + "1A", borderWidth: 0.5, borderColor: theme.accent + "55",
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  styleIcon: { fontSize: 14 },
  styleLbl: { fontFamily: fontFamily.semibold, fontSize: 11, color: theme.accent },
  rightControls: {
    position: "absolute", right: 16, top: 130,
    backgroundColor: "rgba(9,14,26,0.92)", borderRadius: 14, overflow: "hidden",
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  ctrlBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ctrlIcon: { fontFamily: fontFamily.semibold, fontSize: 20, color: theme.textPrimary, lineHeight: 22 },
  ctrlSeparator: { height: 0.5, backgroundColor: theme.border },
  locBtn: {
    position: "absolute", right: 16, bottom: 110,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(9,14,26,0.95)", borderWidth: 1, borderColor: theme.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12,
  },
  locIcon: { fontSize: 22, color: theme.accent },
  statsOverlay: {
    position: "absolute", left: 16, right: 16, bottom: 100, flexDirection: "row",
    backgroundColor: "rgba(9,14,26,0.92)", borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontFamily: fontFamily.monoBold, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.5 },
  statLbl: { fontFamily: fontFamily.semibold, fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  sheet: {
    position: "absolute", left: 16, right: 16, bottom: 96,
    backgroundColor: theme.bgCard, borderRadius: 24, borderWidth: 0.5, borderColor: theme.border,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 16,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: "center", marginTop: 4, marginBottom: 6 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetHeadLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  scorePill: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scoreVal: { fontFamily: fontFamily.monoBold, fontSize: 20, letterSpacing: -0.5 },
  scoreLbl: { fontFamily: fontFamily.semibold, fontSize: 8, letterSpacing: 1, color: theme.textMuted, textTransform: "uppercase", marginTop: 2 },
  sheetTitle: { fontFamily: fontFamily.semibold, fontSize: 16, color: theme.textPrimary, letterSpacing: -0.3 },
  sheetMeta: { fontFamily: fontFamily.monoRegular, fontSize: 11, color: theme.textSecondary, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bgChip, alignItems: "center", justifyContent: "center" },
  closeTxt: { fontFamily: fontFamily.medium, fontSize: 14, color: theme.textSecondary },
  forecastRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bgChip, borderRadius: 12, padding: 10 },
  forecastIcon: { fontSize: 18 },
  forecastTxt: { fontFamily: fontFamily.medium, fontSize: 12, color: theme.textPrimary },
  loadingWrap: { alignItems: "center", padding: 16, gap: 8, flexDirection: "row", justifyContent: "center" },
  loadingTxt: { fontFamily: fontFamily.regular, fontSize: 12, color: theme.textSecondary },
  routesRow: { flexDirection: "row", gap: 8 },
  routeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: theme.bgChip, borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: theme.border,
  },
  routeBtnActive: { borderColor: theme.accent, backgroundColor: theme.accent + "12" },
  routeIcon: { fontSize: 22 },
  routeMid: { flex: 1 },
  routeMode: { fontFamily: fontFamily.semibold, fontSize: 13, color: theme.textPrimary, letterSpacing: -0.2 },
  routeMeta: { fontFamily: fontFamily.monoRegular, fontSize: 10, color: theme.textSecondary, marginTop: 2 },
});
