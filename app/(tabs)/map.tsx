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
    waterfalls
      .filter((w) => w.score >= 4)
      .map((w) => ({
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
body{background:#F0F4F8}
.leaflet-control-attribution{background:rgba(240,244,248,0.85)!important;color:#94A3B8!important;font-size:9px!important}
.leaflet-control-attribution a{color:#64748B!important}

/* ── Marqueur utilisateur — cercle simple ── */
.u-wrap{
  width:28px;height:28px;position:relative;
  display:flex;align-items:center;justify-content:center;
}
.u-pulse{
  position:absolute;width:28px;height:28px;border-radius:50%;
  background:rgba(27,79,155,0.15);border:1px solid rgba(27,79,155,0.35);
}
.u-dot{
  width:14px;height:14px;border-radius:50%;
  background:#1B4F9B;border:2.5px solid #fff;
  box-shadow:0 0 10px rgba(27,79,155,0.7);
  position:relative;z-index:1;
}

/* ── Turbine marker ── */
.t-icon{display:flex;flex-direction:column;align-items:center}
.t-circle{width:34px;height:34px;border-radius:50%;background:#FAFCFF;border:2px solid #1B4F9B;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px rgba(27,79,155,0.25)}
.t-badge{background:#FAFCFF;border:1px solid #1B4F9B;border-radius:5px;padding:1px 4px;margin-top:-3px;font-size:8px;color:#1B4F9B;font-family:monospace;white-space:nowrap}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,renderer:L.canvas()}).setView([46.5,2.35],5.5);
var LAYERS={
  plan:L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; CartoDB',maxZoom:19,subdomains:'abcd'}),
  satellite:L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}',{attribution:'&copy; Google',maxZoom:21,subdomains:['0','1','2','3']}),
  hybride:L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}',{attribution:'&copy; Google',maxZoom:21,subdomains:['0','1','2','3']})
};
var curStyle='hybride';
LAYERS[curStyle].addTo(map);

var wfs=${wfJson};
function scoreR(s){return s>=8?9:s>=6?7:5;}

/* ── LayerGroup pour masquer les chutes quand un itinéraire est actif ── */
var wfLayer=L.layerGroup().addTo(map);

/* ── Flag : empêche map_tap de fermer la fiche juste après un tap sur chute ── */
var _wfTapped=false;

wfs.forEach(function(wf){
  var m=L.circleMarker([wf.lat,wf.lng],{
    radius:scoreR(wf.score),
    fillColor:wf.color,color:'rgba(255,255,255,0.75)',
    weight:1.2,opacity:1,fillOpacity:0.88
  });
  wfLayer.addLayer(m);
  m.on('click',function(e){
    _wfTapped=true;
    setTimeout(function(){_wfTapped=false;},350);
    L.DomEvent.stopPropagation(e);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'wf_tap',id:wf.id}));
  });
});

var userMarker=null, routeLayer=null, turbineMarkers={};

/* ── Icône utilisateur — cercle simple ── */
function makeUserIcon(){
  var html='<div class="u-wrap"><div class="u-pulse"></div><div class="u-dot"></div></div>';
  return L.divIcon({html:html,className:'',iconSize:[28,28],iconAnchor:[14,14]});
}

function onMsg(e){
  try{
    var msg=JSON.parse(e.data);

    if(msg.type==='set_location'){
      var ll=[msg.lat,msg.lng];
      if(!userMarker){
        userMarker=L.marker(ll,{icon:makeUserIcon(),zIndexOffset:1000}).addTo(map);
      } else {
        userMarker.setLatLng(ll);
      }
      if(msg.follow){
        map.panTo(ll,{animate:true,duration:0.4,easeLinearity:0.5});
      }
    }

    if(msg.type==='set_style'){map.removeLayer(LAYERS[curStyle]);curStyle=msg.style;LAYERS[curStyle].addTo(map);}
    if(msg.type==='fly_to'){map.flyTo([msg.lat,msg.lng],msg.zoom||14,{duration:0.8});}
    if(msg.type==='fly_to_user'){if(userMarker)map.flyTo(userMarker.getLatLng(),15,{duration:0.8});}
    if(msg.type==='zoom_in'){map.setZoom(map.getZoom()+1);}
    if(msg.type==='zoom_out'){map.setZoom(map.getZoom()-1);}

    if(msg.type==='show_route'){
      if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
      /* Masquer les chutes pendant qu'un itinéraire est affiché */
      if(map.hasLayer(wfLayer))map.removeLayer(wfLayer);
      if(msg.coords&&msg.coords.length>1){
        var lls=msg.coords.map(function(c){return[c.latitude,c.longitude];});
        routeLayer=L.polyline(lls,{
          color:msg.mode==='foot'?'#2563C4':'#1B4F9B',
          weight:5,opacity:0.92,
          dashArray:msg.mode==='foot'?'8,11':null
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds(),{padding:[80,50],maxZoom:15});
      }
    }

    if(msg.type==='clear_route'){
      if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
      /* Réafficher les chutes quand l'itinéraire est effacé */
      if(!map.hasLayer(wfLayer))wfLayer.addTo(map);
    }

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

/* ── Tap simple (double-tap ignoré, tap sur chute ignoré) ── */
var _tapTimer=null;
map.on('click',function(){
  /* Si une chute vient d'être tappée, ne pas fermer la fiche */
  if(_wfTapped){return;}
  if(_tapTimer){clearTimeout(_tapTimer);_tapTimer=null;return;}
  _tapTimer=setTimeout(function(){_tapTimer=null;window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_tap'}));},280);
});
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
  const [isFollowing, setIsFollowing] = useState(false);

  // Refs stables pour les callbacks async
  const routeCache = useRef<Record<string, RouteOption[]>>({});
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const isFollowingRef = useRef(false);
  const mapReadyRef = useRef(false);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

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

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadRouteCache().then((c) => { routeCache.current = c; });
    AsyncStorage.getItem(STYLE_PREF_KEY).then((s) => {
      if (s === "plan" || s === "satellite" || s === "hybride") setMapStyle(s as StyleId);
    });
  }, []);

  // ── GPS temps réel ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !active) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1500,
          distanceInterval: 4, // ignore updates < 4m pour éviter le jitter
        },
        (loc) => {
          const { latitude, longitude, heading } = loc.coords;
          const pos = { latitude, longitude };
          setLocation(pos);
          locationRef.current = pos;

          if (!mapReadyRef.current) return;

          postMsg({
            type: "set_location",
            lat: latitude,
            lng: longitude,
            heading: heading ?? -1,
            follow: isFollowingRef.current,
          });
        }
      );

      if (active) {
        locationSubRef.current = sub;
      } else {
        sub.remove();
      }
    })();

    return () => {
      active = false;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [postMsg]);

  // ── Turbines ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    postMsg({
      type: "set_turbines",
      turbines: turbines.filter((t) => t.location).map((t) => ({
        id: String(t.id), lat: t.location!.latitude, lng: t.location!.longitude, power: t.power,
      })),
    });
  }, [mapReady, turbines, postMsg]);

  // ── Style ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    postMsg({ type: "set_style", style: mapStyle });
  }, [mapReady, mapStyle, postMsg]);

  // ── Quand la carte est prête, envoyer la position si déjà connue ───────────
  const handleMapLoad = useCallback(() => {
    mapReadyRef.current = true;
    setMapReady(true);
    const pos = locationRef.current;
    if (pos) {
      postMsg({ type: "set_location", lat: pos.latitude, lng: pos.longitude, heading: -1, follow: false });
      postMsg({ type: "fly_to", lat: pos.latitude, lng: pos.longitude, zoom: 13 });
    }
  }, [postMsg]);

  // ── Toggle mode suivi ──────────────────────────────────────────────────────
  const toggleFollow = useCallback(() => {
    const next = !isFollowingRef.current;
    isFollowingRef.current = next;
    setIsFollowing(next);
    if (next && locationRef.current) {
      postMsg({ type: "fly_to_user" });
    }
  }, [postMsg]);

  // ── Messages depuis la carte ───────────────────────────────────────────────
  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "wf_tap") {
        const wf = waterfalls.find((w) => w.id === msg.id);
        if (!wf) return;
        // Désactiver le suivi pour voir la chute sélectionnée
        isFollowingRef.current = false;
        setIsFollowing(false);
        setSelectedWf(wf); setRoutes([]); setActiveRoute(null); setForecast(null);
        postMsg({ type: "fly_to", lat: wf.lat, lng: wf.lng, zoom: 14 });
        fetchRiverForecast(wf.lat, wf.lng).then((f) => f && setForecast(f));
        const cacheKey = String(wf.id);
        if (routeCache.current[cacheKey]) { setRoutes(routeCache.current[cacheKey]); return; }
        if (!locationRef.current) return;
        setRouteLoading(true);
        const loc = locationRef.current;
        const fetchRoute = async (mode: "foot" | "car"): Promise<RouteOption | null> => {
          try {
            const url = `https://router.project-osrm.org/route/v1/${mode}/${loc.longitude},${loc.latitude};${wf.lng},${wf.lat}?overview=full&geometries=geojson`;
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
  }, [waterfalls, postMsg]);

  const selectRoute = (r: RouteOption) => {
    setActiveRoute(r);
    postMsg({ type: "show_route", mode: r.mode, coords: r.coords });
  };

  const cycleStyle = () => {
    const next = STYLE_NEXT[mapStyle];
    setMapStyle(next);
    AsyncStorage.setItem(STYLE_PREF_KEY, next).catch(() => {});
  };

  const goToMyLocation = useCallback(() => {
    if (locationRef.current) {
      postMsg({ type: "fly_to_user" });
    }
  }, [postMsg]);

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
        onLoad={handleMapLoad}
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

      {/* BOUTON SUIVI */}
      <TouchableOpacity
        style={[styles.followBtn, isFollowing && styles.followBtnActive]}
        onPress={toggleFollow}
        activeOpacity={0.7}
      >
        <Text style={styles.followIcon}>🧭</Text>
        {isFollowing && <Text style={styles.followLbl}>Suivi</Text>}
      </TouchableOpacity>

      {/* BOUTON MA POSITION */}
      <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation} activeOpacity={0.7}>
        <Text style={styles.locIcon}>➤</Text>
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
              <Text style={styles.loadingTxt}>{locationRef.current ? "Itinéraire indisponible" : "Position GPS requise"}</Text>
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
    backgroundColor: "rgba(250,252,255,0.94)", borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: theme.primary, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8,
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
    backgroundColor: "rgba(250,252,255,0.95)", borderRadius: 14, overflow: "hidden",
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: theme.primary, shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  ctrlBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ctrlIcon: { fontFamily: fontFamily.semibold, fontSize: 20, color: theme.textPrimary, lineHeight: 22 },
  ctrlSeparator: { height: 0.5, backgroundColor: theme.border },

  // Bouton suivi
  followBtn: {
    position: "absolute", right: 16, bottom: 170,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(250,252,255,0.95)", borderWidth: 1, borderColor: theme.border,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.primary, shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  followBtnActive: {
    backgroundColor: theme.accent + "20",
    borderColor: theme.accent,
    shadowColor: theme.accent, shadowOpacity: 0.6, shadowRadius: 14,
    width: 70, borderRadius: 25, flexDirection: "row", gap: 4, paddingHorizontal: 10,
  },
  followIcon: { fontSize: 20 },
  followLbl: { fontFamily: fontFamily.semibold, fontSize: 11, color: theme.accent },

  locBtn: {
    position: "absolute", right: 16, bottom: 110,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(250,252,255,0.95)", borderWidth: 1.5, borderColor: theme.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.accent, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  locIcon: { fontSize: 22, color: theme.accent },
  statsOverlay: {
    position: "absolute", left: 16, right: 16, bottom: 100, flexDirection: "row",
    backgroundColor: "rgba(250,252,255,0.96)", borderRadius: 20, borderWidth: 0.5, borderColor: theme.border,
    paddingVertical: 14, shadowColor: theme.primary, shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontFamily: fontFamily.monoBold, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.5 },
  statLbl: { fontFamily: fontFamily.semibold, fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  sheet: {
    position: "absolute", left: 16, right: 16, bottom: 96,
    backgroundColor: theme.bgCard, borderRadius: 24, borderWidth: 0.5, borderColor: theme.border,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10,
    shadowColor: theme.primary, shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10,
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
