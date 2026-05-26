import { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapLibreGL from "@maplibre/maplibre-react-native";
import {
  StyleSheet, View, Text, TouchableOpacity, Animated,
  PanResponder, Dimensions,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  MAP_STYLE_BY_ID, NEXT_STYLE, STYLE_LABEL, STYLE_ICON, MapStyleId,
} from "./mapStyles";
import { getStaticWaterfallsAsWaterways } from "../assets/waterfallsFR";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const PANEL_MIN = 100;
const PANEL_MAX = SCREEN_HEIGHT * 0.48;
const TILE_SIZE = 0.08;
const ROUTE_CACHE_KEY = "hydrotech_route_cache";
const STYLE_PREF_KEY = "hydrotech_map_style";

// ─── Intensité de débit ───────────────────────────────────────────────────────
type FlowIntensity = "faible" | "moyen" | "fort";

const FLOW_COLOR: Record<FlowIntensity, string> = {
  faible: "#60A5FA",
  moyen:  "#1D6FCC",
  fort:   "#0A2F6E",
};
const FLOW_LABEL: Record<FlowIntensity, string> = {
  faible: "Faible",
  moyen:  "Moyen",
  fort:   "Fort",
};
const FLOW_DEBIT: Record<FlowIntensity, string> = {
  faible: "~0.3 m³/s",
  moyen:  "~3 m³/s",
  fort:   "~15 m³/s",
};

function getFlowIntensity(type: string, width?: number): FlowIntensity {
  if (type === "waterfall" || type === "river") return "fort";
  if (width && width > 5) return "fort";
  if (width && width > 2) return "moyen";
  return "faible";
}

// ─── Épingle teardrop SVG ─────────────────────────────────────────────────────
// Forme Google Maps : cercle en haut, pointe en bas.
// Taille : 32 × 44 px. Cercle centré sur (16, 15), r=13.
const PIN_W = 32;
const PIN_H = 44;
const PIN_CX = 16;
const PIN_CY = 15;
const PIN_PATH = `M${PIN_CX} ${PIN_H - 2} C 10 34, 2 25, 2 ${PIN_CY} A 14 14 0 0 1 30 ${PIN_CY} C 30 25, 22 34, ${PIN_CX} ${PIN_H - 2} Z`;
const SHADOW_PATH = `M${PIN_CX} ${PIN_H} C 11 36, 3 27, 3 ${PIN_CY + 1} A 13 13 0 0 1 29 ${PIN_CY + 1} C 29 27, 21 36, ${PIN_CX} ${PIN_H} Z`;

function WaterPin({ intensity }: { intensity: FlowIntensity }) {
  const color = FLOW_COLOR[intensity];
  return (
    <View style={pin.wrap}>
      {/* ombre portée */}
      <Svg width={PIN_W + 4} height={PIN_H + 4}
        style={{ position: "absolute", top: 3, left: -1 }}
        viewBox={`0 0 ${PIN_W} ${PIN_H}`}>
        <Path d={SHADOW_PATH} fill="rgba(0,0,0,0.22)" />
      </Svg>
      {/* corps de l'épingle */}
      <Svg width={PIN_W} height={PIN_H} viewBox={`0 0 ${PIN_W} ${PIN_H}`}>
        <Path d={PIN_PATH} fill={color} />
        {/* contour blanc fin à l'intérieur du cercle */}
        <Circle cx={PIN_CX} cy={PIN_CY} r={10} fill="none"
          stroke="white" strokeWidth={1.5} />
      </Svg>
      {/* icône 💧 centré sur le cercle */}
      <View style={pin.icon}>
        <Text style={pin.emoji}>💧</Text>
      </View>
    </View>
  );
}

const pin = StyleSheet.create({
  wrap: { width: PIN_W, height: PIN_H + 4, alignItems: "center" },
  icon: {
    position: "absolute", top: 3,
    width: PIN_W, alignItems: "center", justifyContent: "center",
  },
  emoji: { fontSize: 13, lineHeight: 24 },
});

// ─── Types ────────────────────────────────────────────────────────────────────
type WaterWay = {
  id: number; type: string; name: string;
  coords: { latitude: number; longitude: number }[];
  width?: number;
  midPoint: { latitude: number; longitude: number };
  isPoint?: boolean;
};
type RouteOption = {
  mode: "foot" | "bike";
  coords: { latitude: number; longitude: number }[];
  distance: string; duration: string;
};
type Props = {
  mapRef: React.RefObject<any>;
  location: { latitude: number; longitude: number } | null;
  turbines: any[];
  preloadedWaterways?: any[];
};

const getTileKey = (lat: number, lng: number) =>
  `${Math.floor(lat / TILE_SIZE)}_${Math.floor(lng / TILE_SIZE)}`;

async function loadRouteCache(): Promise<Record<string, RouteOption[]>> {
  try { const r = await AsyncStorage.getItem(ROUTE_CACHE_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
async function saveRouteCache(c: Record<string, RouteOption[]>) {
  try { await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function WaterMap({ mapRef, location, turbines, preloadedWaterways }: Props) {
  const [waterways, setWaterways] = useState<WaterWay[]>([]);

  // Popup info (avant chargement des itinéraires)
  const [popupWay, setPopupWay] = useState<WaterWay | null>(null);

  // Panel itinéraires
  const [selectedWay, setSelectedWay] = useState<WaterWay | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

  const [mapStyle, setMapStyle] = useState<MapStyleId>("standard");

  const fetchedTiles = useRef<Set<string>>(new Set());
  const routeCache = useRef<Record<string, RouteOption[]>>({});
  const isNavigating = useRef(false);
  const cameraRef = useRef<any>(null);
  const panelY = useRef(new Animated.Value(PANEL_MIN)).current;
  const lastY = useRef(PANEL_MIN);

  // ── Setup mapRef externe ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef) return;
    mapRef.current = {
      animateToRegion: (region: { latitude: number; longitude: number }) => {
        cameraRef.current?.setCamera({
          centerCoordinate: [region.longitude, region.latitude],
          zoomLevel: 14, animationDuration: 800,
        });
      },
      fitToCoordinates: (coords: { latitude: number; longitude: number }[]) => {
        if (!coords.length) return;
        const lats = coords.map(c => c.latitude);
        const lngs = coords.map(c => c.longitude);
        cameraRef.current?.fitBounds(
          [Math.max(...lngs), Math.max(...lats)],
          [Math.min(...lngs), Math.min(...lats)],
          [100, 50, 300, 50], 500,
        );
      },
    };
  }, [mapRef]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadRouteCache().then(c => { routeCache.current = c; });
    AsyncStorage.getItem(STYLE_PREF_KEY).then(s => {
      if (s === "standard" || s === "satellite" || s === "hybrid") setMapStyle(s as MapStyleId);
    });
    const staticFalls = getStaticWaterfallsAsWaterways();
    setWaterways(prev => {
      const ids = new Set(prev.map(w => w.id));
      return [...prev, ...staticFalls.filter((w: any) => !ids.has(w.id))];
    });
  }, []);

  useEffect(() => {
    if (preloadedWaterways?.length) {
      setWaterways(prev => {
        const ids = new Set(prev.map(w => w.id));
        return [...prev, ...preloadedWaterways.filter((w: any) => !ids.has(w.id))];
      });
    }
  }, [preloadedWaterways]);

  useEffect(() => {
    if (!location) return;
    fetchWaterways(location.latitude, location.longitude);
    if (isNavigating.current && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 14, animationDuration: 500,
      });
    }
  }, [location]);

  // ── Map style ───────────────────────────────────────────────────────────────
  const cycleMapStyle = () => {
    const next = NEXT_STYLE[mapStyle];
    setMapStyle(next);
    AsyncStorage.setItem(STYLE_PREF_KEY, next).catch(() => {});
  };

  // ── PanResponder panneau ────────────────────────────────────────────────────
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      const ny = lastY.current - g.dy;
      if (ny >= PANEL_MIN && ny <= PANEL_MAX) panelY.setValue(ny);
    },
    onPanResponderRelease: (_, g) => {
      const ny = lastY.current - g.dy;
      const target = (g.vy < -0.5 || ny > SCREEN_HEIGHT * 0.25) ? PANEL_MAX : PANEL_MIN;
      Animated.spring(panelY, { toValue: target, useNativeDriver: false }).start();
      lastY.current = target;
    },
  });

  // ── Overpass fetch ──────────────────────────────────────────────────────────
  const buildOverpassQuery = (lat: number, lng: number, radius: number) =>
    `[out:json][timeout:15];(` +
    `way["waterway"~"river|stream|canal"](around:${radius},${lat},${lng});` +
    `way["waterway"="waterfall"](around:${radius},${lat},${lng});` +
    `node["waterway"="waterfall"](around:${radius},${lat},${lng});` +
    `node["natural"="waterfall"](around:${radius},${lat},${lng});` +
    `);out geom qt;`;

  const parseOverpassElement = (el: any): WaterWay | null => {
    if (el.type === "node") {
      if (typeof el.lat !== "number" || typeof el.lon !== "number") return null;
      const pt = { latitude: el.lat, longitude: el.lon };
      return { id: el.id, type: el.tags?.waterway || el.tags?.natural || "waterfall", name: el.tags?.name ?? "", coords: [pt], midPoint: pt, isPoint: true };
    }
    if (el.geometry?.length > 1) {
      const coords = el.geometry.map((g: any) => ({ latitude: g.lat, longitude: g.lon }));
      return { id: el.id, type: el.tags?.waterway ?? "stream", name: el.tags?.name ?? "", width: el.tags?.width ? parseFloat(el.tags.width) : undefined, coords, midPoint: coords[Math.floor(coords.length / 2)], isPoint: false };
    }
    return null;
  };

  const fetchWaterways = async (lat: number, lng: number) => {
    const key = getTileKey(lat, lng);
    if (fetchedTiles.current.has(key)) return;
    fetchedTiles.current.add(key);
    try {
      const cached = await AsyncStorage.getItem(`waterways_${key}`);
      if (cached) {
        const ways: WaterWay[] = JSON.parse(cached);
        setWaterways(prev => {
          const ids = new Set(prev.map(w => w.id));
          return [...prev, ...ways.filter(w => !ids.has(w.id))];
        });
        return;
      }
    } catch {}
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", body: buildOverpassQuery(lat, lng, 15000), signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await res.json();
      const ways: WaterWay[] = (data.elements || [])
        .map(parseOverpassElement)
        .filter((w: WaterWay | null): w is WaterWay => w !== null);
      try { await AsyncStorage.setItem(`waterways_${key}`, JSON.stringify(ways)); } catch {}
      setWaterways(prev => {
        const ids = new Set(prev.map(w => w.id));
        return [...prev, ...ways.filter(w => !ids.has(w.id))];
      });
    } catch (e) { fetchedTiles.current.delete(key); }
  };

  const onRegionDidChange = (e: any) => {
    const center = e?.geometry?.coordinates;
    if (Array.isArray(center) && center.length === 2)
      fetchWaterways(center[1], center[0]);
  };

  // ── Tap épingle → popup info ────────────────────────────────────────────────
  const onPinPress = (way: WaterWay) => {
    setPopupWay(way);
  };

  // ── "Y aller" → charger itinéraires ────────────────────────────────────────
  const handleGoTo = async (way: WaterWay) => {
    setPopupWay(null);
    setSelectedWay(way);
    setShowDirections(true);
    setLoadingRoute(true);
    setRouteOptions([]);
    setActiveRoute(null);
    panelY.setValue(PANEL_MIN);
    lastY.current = PANEL_MIN;
    Animated.spring(panelY, { toValue: PANEL_MAX, useNativeDriver: false }).start();
    lastY.current = PANEL_MAX;

    const cacheKey = `${way.id}`;
    if (routeCache.current[cacheKey]?.length) {
      setRouteOptions(routeCache.current[cacheKey]);
      setLoadingRoute(false);
      return;
    }
    const fetchRoute = async (mode: "foot" | "bike"): Promise<RouteOption | null> => {
      if (!location) return null;
      try {
        const url = `https://router.project-osrm.org/route/v1/${mode}/${location.longitude},${location.latitude};${way.midPoint.longitude},${way.midPoint.latitude}?overview=full&geometries=geojson`;
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
          const dur = min > 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} min`;
          return { mode, coords, distance: `${km} km`, duration: dur };
        }
      } catch {}
      return null;
    };
    const [foot, bike] = await Promise.all([fetchRoute("foot"), fetchRoute("bike")]);
    const opts = [foot, bike].filter(Boolean) as RouteOption[];
    if (opts.length) { routeCache.current[cacheKey] = opts; saveRouteCache(routeCache.current); }
    setRouteOptions(opts);
    setLoadingRoute(false);
  };

  const selectRoute = (option: RouteOption) => {
    setActiveRoute(option);
    isNavigating.current = true;
    if (option.coords.length && cameraRef.current) {
      const lats = option.coords.map(c => c.latitude);
      const lngs = option.coords.map(c => c.longitude);
      cameraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        [100, 50, 300, 50], 500,
      );
    }
  };

  const closeDirections = () => {
    setShowDirections(false);
    setSelectedWay(null);
    setActiveRoute(null);
    setRouteOptions([]);
    isNavigating.current = false;
  };

  // ── Helpers couches ─────────────────────────────────────────────────────────
  const getColor = (type: string, width?: number) => {
    if (type === "river") return "#1565c0";
    if (type === "waterfall") return "#1e88e5";
    if (width && width > 5) return "#1976d2";
    return "#42a5f5";
  };
  const getStrokeWidth = (type: string, width?: number) => {
    if (type === "river") return 4;
    if (width && width > 5) return 3.5;
    return 2.5;
  };

  // Déduplication des marqueurs visibles
  const filterMarkers = (ways: WaterWay[]) => {
    const seen: { name: string; lat: number; lng: number }[] = [];
    return ways
      .filter(w => w.name || w.type === "waterfall")
      .filter(w => {
        if (!w.name) return true;
        const ex = seen.find(s =>
          s.name === w.name &&
          Math.abs(s.lat - w.midPoint.latitude) < 0.045 &&
          Math.abs(s.lng - w.midPoint.longitude) < 0.045,
        );
        if (ex) return false;
        seen.push({ name: w.name, lat: w.midPoint.latitude, lng: w.midPoint.longitude });
        return true;
      });
  };

  const isSatellite = mapStyle === "satellite" || mapStyle === "hybrid";
  const markers = filterMarkers(waterways);

  const waterwaysGeoJSON = {
    type: "FeatureCollection" as const,
    features: waterways.filter(w => !w.isPoint && w.coords.length > 1).map(w => ({
      type: "Feature" as const,
      properties: { color: getColor(w.type, w.width), width: getStrokeWidth(w.type, w.width) },
      geometry: { type: "LineString" as const, coordinates: w.coords.map(c => [c.longitude, c.latitude]) },
    })),
  };
  const activeRouteGeoJSON = activeRoute
    ? { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: activeRoute.coords.map(c => [c.longitude, c.latitude]) } }
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── Carte ── */}
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        mapStyle={MAP_STYLE_BY_ID[mapStyle]}
        logoEnabled={false}
        attributionEnabled={true}
        compassEnabled={false}
        onRegionDidChange={onRegionDidChange}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: location ? [location.longitude, location.latitude] : [-1.5536, 47.2184],
            zoomLevel: 13,
          }}
        />
        <MapLibreGL.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          androidRenderMode="compass"
          renderMode="native"
        />

        {/* Tracés cours d'eau */}
        {waterwaysGeoJSON.features.length > 0 && (
          <MapLibreGL.ShapeSource id="ways-src" shape={waterwaysGeoJSON}>
            <MapLibreGL.LineLayer
              id="ways-line"
              style={{
                lineColor: isSatellite ? "#3da5ff" : ["get", "color"],
                lineOpacity: isSatellite ? 0.85 : 1,
                lineWidth: ["get", "width"],
                lineCap: "round", lineJoin: "round",
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Épingles points d'eau */}
        {markers.map(w => {
          const intensity = getFlowIntensity(w.type, w.width);
          return (
            <MapLibreGL.PointAnnotation
              key={`pt-${w.id}`}
              id={`pt-${w.id}`}
              coordinate={[w.midPoint.longitude, w.midPoint.latitude]}
              anchor={{ x: 0.5, y: 1 }}
              onSelected={() => onPinPress(w)}
            >
              <WaterPin intensity={intensity} />
            </MapLibreGL.PointAnnotation>
          );
        })}

        {/* Route active */}
        {activeRouteGeoJSON && (
          <MapLibreGL.ShapeSource id="route-src" shape={activeRouteGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: "#1B4F9B",
                lineWidth: 4,
                lineCap: "round", lineJoin: "round",
                lineDasharray: activeRoute?.mode === "foot" ? [2, 2] : [1, 0],
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Turbines */}
        {turbines.map(t => t.location ? (
          <MapLibreGL.PointAnnotation
            key={`t-${t.id}`} id={`t-${t.id}`}
            coordinate={[t.location.longitude, t.location.latitude]}
          >
            <View style={s.turbinePin}><Text style={s.turbineIcon}>⚡</Text></View>
          </MapLibreGL.PointAnnotation>
        ) : null)}
      </MapLibreGL.MapView>

      {/* ── Bouton style carte ── */}
      <TouchableOpacity style={s.styleBtn} onPress={cycleMapStyle}>
        <Text style={s.styleIcon}>{STYLE_ICON[mapStyle]}</Text>
        <Text style={s.styleLabel}>{STYLE_LABEL[mapStyle]}</Text>
      </TouchableOpacity>

      {/* ── Popup info épingle ── */}
      {popupWay && (() => {
        const intensity = getFlowIntensity(popupWay.type, popupWay.width);
        const color = FLOW_COLOR[intensity];
        return (
          <View style={s.popupOverlay}>
            <View style={s.popup}>
              {/* Handle */}
              <View style={s.popupHandle} />

              {/* Header */}
              <View style={s.popupHeader}>
                <View style={[s.popupFlowDot, { backgroundColor: color }]} />
                <Text style={s.popupTitle} numberOfLines={1}>
                  {popupWay.name || "Point d'eau"}
                </Text>
                <TouchableOpacity style={s.popupClose} onPress={() => setPopupWay(null)}>
                  <Text style={s.popupCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Badges débit */}
              <View style={s.popupBadgeRow}>
                <View style={[s.popupBadge, { backgroundColor: color + "1A", borderColor: color + "55" }]}>
                  <Text style={[s.popupBadgeTxt, { color }]}>
                    💧 Débit {FLOW_LABEL[intensity]}
                  </Text>
                </View>
                <View style={s.popupDebitBadge}>
                  <Text style={s.popupDebitTxt}>{FLOW_DEBIT[intensity]}</Text>
                </View>
              </View>

              {/* Type + coordonnées */}
              <Text style={s.popupMeta}>
                {popupWay.type.charAt(0).toUpperCase() + popupWay.type.slice(1)}
                {popupWay.width ? `  ·  ~${popupWay.width}m de large` : ""}
                {"  ·  "}
                {popupWay.midPoint.latitude.toFixed(4)}, {popupWay.midPoint.longitude.toFixed(4)}
              </Text>

              {/* Bouton Y aller */}
              <TouchableOpacity
                style={s.goBtn}
                onPress={() => handleGoTo(popupWay)}
                activeOpacity={0.82}
              >
                <Text style={s.goBtnTxt}>Y aller  →</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* ── Panneau itinéraires ── */}
      {showDirections && selectedWay && (
        <Animated.View
          style={[s.directionsPanel, { height: panelY }]}
          {...panResponder.panHandlers}
        >
          <View style={s.dragBarWrap}><View style={s.dragBar} /></View>

          {/* En-tête */}
          <View style={s.dirHeader}>
            <View style={s.dirHeaderLeft}>
              {(() => {
                const intensity = getFlowIntensity(selectedWay.type, selectedWay.width);
                const color = FLOW_COLOR[intensity];
                return (
                  <>
                    <Text style={s.dirTitle} numberOfLines={1}>
                      {selectedWay.name || "Point d'eau"}
                    </Text>
                    <View style={s.dirBadgeRow}>
                      <View style={[s.dirFlowBadge, { backgroundColor: color + "1A", borderColor: color + "55" }]}>
                        <Text style={[s.dirFlowTxt, { color }]}>
                          💧 {FLOW_LABEL[intensity]}  ·  {FLOW_DEBIT[intensity]}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={closeDirections}>
              <Text style={s.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options itinéraires */}
          {loadingRoute ? (
            <View style={s.loadingWrap}>
              <Text style={s.loadingTxt}>Calcul des itinéraires...</Text>
            </View>
          ) : routeOptions.length === 0 ? (
            <View style={s.loadingWrap}>
              <Text style={s.loadingTxt}>Itinéraire indisponible (réseau ?)</Text>
            </View>
          ) : (
            <View style={s.routeOptions}>
              {routeOptions.map(option => (
                <TouchableOpacity
                  key={option.mode}
                  style={[s.routeOption, activeRoute?.mode === option.mode && s.routeOptionActive]}
                  onPress={() => selectRoute(option)}
                >
                  <Text style={s.routeOptionIcon}>{option.mode === "foot" ? "🚶" : "🚴"}</Text>
                  <View style={s.routeOptionInfo}>
                    <Text style={s.routeOptionMode}>{option.mode === "foot" ? "À pied" : "À vélo"}</Text>
                    <Text style={s.routeOptionDetails}>{option.distance}  ·  {option.duration}</Text>
                  </View>
                  {activeRoute?.mode === option.mode && (
                    <View style={s.activeIndicator}>
                      <Text style={s.activeIndicatorTxt}>En cours</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Barre navigation active */}
          {activeRoute && (
            <View style={s.navBar}>
              <View style={s.navDot} />
              <Text style={s.navTxt}>
                {activeRoute.mode === "foot" ? "🚶 À pied" : "🚴 À vélo"}
                {"  ·  "}{activeRoute.distance}{"  ·  "}{activeRoute.duration}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Turbines
  turbinePin: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#16A34A", borderWidth: 2.5, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#16A34A", shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  turbineIcon: { fontSize: 13 },

  // Bouton style carte
  styleBtn: {
    position: "absolute", top: 100, right: 14,
    backgroundColor: "rgba(250,252,255,0.95)",
    borderWidth: 0.5, borderColor: "#CBD5E1", borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", gap: 6,
    zIndex: 30,
    shadowColor: "#1B4F9B", shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  styleIcon: { fontSize: 16 },
  styleLabel: { color: "#1B4F9B", fontSize: 11 },

  // ── Popup info (avant itinéraire) ──────────────────────────────────────────
  popupOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 96, // au-dessus de la tab bar
    zIndex: 50,
  },
  popup: {
    backgroundColor: "#FAFCFF",
    borderRadius: 20,
    borderWidth: 0.5, borderColor: "#CBD5E1",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
    gap: 10,
    shadowColor: "#1B4F9B", shadowOpacity: 0.14, shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  popupHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 4,
  },
  popupHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  popupFlowDot: {
    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
  },
  popupTitle: {
    flex: 1, fontSize: 16, color: "#0F172A",
    fontFamily: "BebasNeue_400Regular", letterSpacing: 0.5,
  },
  popupClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E8EDF5", alignItems: "center", justifyContent: "center",
  },
  popupCloseTxt: { fontSize: 12, color: "#64748B" },
  popupBadgeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  popupBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  popupBadgeTxt: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  popupDebitBadge: {
    backgroundColor: "#E8EDF5", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  popupDebitTxt: {
    fontSize: 12, color: "#475569",
    fontFamily: "JetBrainsMono_500Medium",
  },
  popupMeta: {
    fontSize: 11, color: "#94A3B8",
    fontFamily: "JetBrainsMono_400Regular",
  },
  goBtn: {
    backgroundColor: "#1B4F9B",
    borderRadius: 14, paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#1B4F9B", shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  goBtnTxt: {
    fontSize: 14, color: "#F0F4F8",
    fontFamily: "Outfit_600SemiBold", letterSpacing: 0.3,
  },

  // ── Panneau itinéraires ────────────────────────────────────────────────────
  directionsPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FAFCFF",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 0.5, borderColor: "#CBD5E1",
    shadowColor: "#1B4F9B", shadowOpacity: 0.12, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  dragBarWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  dragBar: { width: 36, height: 4, backgroundColor: "#CBD5E1", borderRadius: 2 },

  dirHeader: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
  },
  dirHeaderLeft: { flex: 1, gap: 6 },
  dirTitle: {
    fontSize: 18, color: "#0F172A",
    fontFamily: "BebasNeue_400Regular", letterSpacing: 0.5,
  },
  dirBadgeRow: { flexDirection: "row" },
  dirFlowBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  dirFlowTxt: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },

  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#E8EDF5", alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  closeBtnTxt: { fontSize: 13, color: "#64748B" },

  loadingWrap: { padding: 20, alignItems: "center" },
  loadingTxt: { fontSize: 13, color: "#1B4F9B", fontFamily: "Outfit_400Regular" },

  routeOptions: { paddingHorizontal: 16, gap: 8 },
  routeOption: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F4F8",
    borderWidth: 0.5, borderColor: "#CBD5E1", borderRadius: 14,
    padding: 12, gap: 12,
  },
  routeOptionActive: {
    borderColor: "#1B4F9B",
    backgroundColor: "rgba(27,79,155,0.08)",
  },
  routeOptionIcon: { fontSize: 24 },
  routeOptionInfo: { flex: 1 },
  routeOptionMode: {
    fontSize: 14, color: "#0F172A",
    fontFamily: "Outfit_600SemiBold",
  },
  routeOptionDetails: {
    fontSize: 12, color: "#64748B",
    fontFamily: "JetBrainsMono_400Regular", marginTop: 2,
  },
  activeIndicator: {
    backgroundColor: "rgba(27,79,155,0.08)",
    borderWidth: 0.5, borderColor: "rgba(27,79,155,0.25)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  activeIndicatorTxt: {
    fontSize: 10, color: "#1B4F9B",
    fontFamily: "Outfit_600SemiBold",
  },

  navBar: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: "#1B4F9B", borderRadius: 12,
    padding: 12,
  },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F0F4F8", marginRight: 8 },
  navTxt: { fontSize: 13, color: "#F0F4F8", fontFamily: "Outfit_600SemiBold" },
});
