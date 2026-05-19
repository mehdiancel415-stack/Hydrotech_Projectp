import { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapLibreGL from "@maplibre/maplibre-react-native";
import {
  StyleSheet, View, Text, TouchableOpacity, Animated, PanResponder, Dimensions,
} from "react-native";
import {
  MAP_STYLE_BY_ID, NEXT_STYLE, STYLE_LABEL, STYLE_ICON, MapStyleId,
} from "./mapStyles";
import { getStaticWaterfallsAsWaterways } from "../assets/waterfallsFR";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const PANEL_MIN = 100;
const PANEL_MAX = SCREEN_HEIGHT * 0.45;
const TILE_SIZE = 0.08;
const ROUTE_CACHE_KEY = "hydrotech_route_cache";
const STYLE_PREF_KEY = "hydrotech_map_style";

const getTileKey = (lat: number, lng: number) =>
  `${Math.floor(lat / TILE_SIZE)}_${Math.floor(lng / TILE_SIZE)}`;

type WaterWay = {
  id: number; type: string; name: string;
  coords: { latitude: number; longitude: number }[];
  width?: number; midPoint: { latitude: number; longitude: number };
  isPoint?: boolean;
};
type RouteOption = { mode: "foot" | "bike"; coords: { latitude: number; longitude: number }[]; distance: string; duration: string; };
type Props = {
  mapRef: React.RefObject<any>;
  location: { latitude: number; longitude: number } | null;
  turbines: any[];
  preloadedWaterways?: any[];
};

async function loadRouteCache(): Promise<Record<string, RouteOption[]>> {
  try { const raw = await AsyncStorage.getItem(ROUTE_CACHE_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
async function saveRouteCache(c: Record<string, RouteOption[]>) {
  try { await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

export default function WaterMap({ mapRef, location, turbines, preloadedWaterways }: Props) {
  const [waterways, setWaterways] = useState<WaterWay[]>([]);
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
        if (coords.length === 0) return;
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

  useEffect(() => {
    loadRouteCache().then(c => { routeCache.current = c; });
    AsyncStorage.getItem(STYLE_PREF_KEY).then(s => {
      if (s === "standard" || s === "satellite" || s === "hybrid") setMapStyle(s);
    });
    // === Charge les chutes d'eau de France au démarrage ===
    // Bundlées dans l'app (assets/waterfallsFR.ts) — toujours dispo, offline complet.
    const staticFalls = getStaticWaterfallsAsWaterways();
    setWaterways(prev => {
      const ids = new Set(prev.map(w => w.id));
      return [...prev, ...staticFalls.filter((w: any) => !ids.has(w.id))];
    });
  }, []);

  const cycleMapStyle = () => {
    const next = NEXT_STYLE[mapStyle];
    setMapStyle(next);
    AsyncStorage.setItem(STYLE_PREF_KEY, next).catch(() => {});
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      const newY = lastY.current - g.dy;
      if (newY >= PANEL_MIN && newY <= PANEL_MAX) panelY.setValue(newY);
    },
    onPanResponderRelease: (_, g) => {
      const newY = lastY.current - g.dy;
      if (g.vy < -0.5 || newY > SCREEN_HEIGHT * 0.25) {
        Animated.spring(panelY, { toValue: PANEL_MAX, useNativeDriver: false }).start();
        lastY.current = PANEL_MAX;
      } else {
        Animated.spring(panelY, { toValue: PANEL_MIN, useNativeDriver: false }).start();
        lastY.current = PANEL_MIN;
      }
    },
  });

  // Fusion (pas écrasement) des waterways préchargés — utilisé par splash + bouton "Télécharger zone"
  useEffect(() => {
    if (preloadedWaterways && preloadedWaterways.length > 0) {
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
      return { id: el.id, type: el.tags?.waterway || el.tags?.natural || "waterfall", name: el.tags?.name ?? "", width: undefined, coords: [pt], midPoint: pt, isPoint: true };
    }
    if (el.geometry && el.geometry.length > 1) {
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
      const ways: WaterWay[] = (data.elements || []).map(parseOverpassElement).filter((w: WaterWay | null): w is WaterWay => w !== null);
      try { await AsyncStorage.setItem(`waterways_${key}`, JSON.stringify(ways)); } catch {}
      setWaterways(prev => {
        const ids = new Set(prev.map(w => w.id));
        return [...prev, ...ways.filter(w => !ids.has(w.id))];
      });
    } catch (e) { fetchedTiles.current.delete(key); console.log("Overpass error:", e); }
  };

  const onRegionDidChange = (e: any) => {
    const center = e?.geometry?.coordinates;
    if (Array.isArray(center) && center.length === 2) {
      fetchWaterways(center[1], center[0]);
    }
  };

  const fetchRouteOption = async (way: WaterWay, mode: "foot" | "bike"): Promise<RouteOption | null> => {
    if (!location) return null;
    try {
      const profile = mode === "foot" ? "foot" : "bike";
      const url = `https://router.project-osrm.org/route/v1/${profile}/${location.longitude},${location.latitude};${way.midPoint.longitude},${way.midPoint.latitude}?overview=full&geometries=geojson`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        const coords = r.geometry.coordinates.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
        const distanceKm = (r.distance / 1000).toFixed(1);
        const durationMin = Math.round(r.duration / 60);
        const durationStr = durationMin > 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}min` : `${durationMin} min`;
        return { mode, coords, distance: `${distanceKm} km`, duration: durationStr };
      }
    } catch (e) { console.log("OSRM error:", e); }
    return null;
  };

  const openDirections = async (way: WaterWay) => {
    setSelectedWay(way); setShowDirections(true); setLoadingRoute(true);
    setRouteOptions([]); setActiveRoute(null);
    panelY.setValue(PANEL_MIN); lastY.current = PANEL_MIN;
    Animated.spring(panelY, { toValue: PANEL_MAX, useNativeDriver: false }).start();
    lastY.current = PANEL_MAX;
    const cacheKey = `${way.id}`;
    if (routeCache.current[cacheKey] && routeCache.current[cacheKey].length > 0) {
      setRouteOptions(routeCache.current[cacheKey]); setLoadingRoute(false); return;
    }
    const [foot, bike] = await Promise.all([fetchRouteOption(way, "foot"), fetchRouteOption(way, "bike")]);
    const options = [foot, bike].filter(Boolean) as RouteOption[];
    if (options.length > 0) { routeCache.current[cacheKey] = options; saveRouteCache(routeCache.current); }
    setRouteOptions(options); setLoadingRoute(false);
  };

  const selectRoute = (option: RouteOption) => {
    setActiveRoute(option); isNavigating.current = true;
    if (option.coords.length > 0 && cameraRef.current) {
      const lats = option.coords.map(c => c.latitude); const lngs = option.coords.map(c => c.longitude);
      cameraRef.current.fitBounds([Math.max(...lngs), Math.max(...lats)], [Math.min(...lngs), Math.min(...lats)], [100, 50, 300, 50], 500);
    }
  };

  const closeDirections = () => {
    setShowDirections(false); setSelectedWay(null);
    setActiveRoute(null); setRouteOptions([]); isNavigating.current = false;
  };

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
  const getDebit = (type: string, width?: number) => {
    if (type === "waterfall") return "Chute — fort débit";
    if (type === "river") return "Rivière — débit élevé";
    if (width && width > 5) return "Cours large — bon débit";
    if (width && width > 2) return "Ruisseau — débit moyen";
    return "Ruisseau — débit faible";
  };
  const getDebitColor = (type: string, width?: number) => {
    if (type === "waterfall" || type === "river") return "#1565c0";
    if (width && width > 5) return "#1976d2";
    return "#546e7a";
  };
  const filterMarkers = (ways: WaterWay[]) => {
    const seen: { name: string; lat: number; lng: number }[] = [];
    return ways.filter(w => w.name || w.type === "waterfall").filter(w => {
      if (!w.name) return true;
      const ex = seen.find(s => s.name === w.name && Math.abs(s.lat - w.midPoint.latitude) < 0.045 && Math.abs(s.lng - w.midPoint.longitude) < 0.045);
      if (ex) return false;
      seen.push({ name: w.name, lat: w.midPoint.latitude, lng: w.midPoint.longitude });
      return true;
    });
  };

  const isSatellite = mapStyle === "satellite" || mapStyle === "hybrid";

  const waterwaysGeoJSON = {
    type: "FeatureCollection" as const,
    features: waterways.filter(w => !w.isPoint && w.coords.length > 1).map(w => ({
      type: "Feature" as const,
      properties: { id: w.id, color: getColor(w.type, w.width), width: getStrokeWidth(w.type, w.width) },
      geometry: { type: "LineString" as const, coordinates: w.coords.map(c => [c.longitude, c.latitude]) },
    })),
  };
  const activeRouteGeoJSON = activeRoute ? { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: activeRoute.coords.map(c => [c.longitude, c.latitude]) } } : null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
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

        {filterMarkers(waterways).map(w => {
          const isWaterfall = w.type === "waterfall";
          const isRiver = w.type === "river" || (w.width && w.width > 5);
          return (
            <MapLibreGL.PointAnnotation
              key={`pt-${w.id}`} id={`pt-${w.id}`}
              coordinate={[w.midPoint.longitude, w.midPoint.latitude]}
              onSelected={() => openDirections(w)}
            >
              <View style={isWaterfall ? styles.waterfallPin : (isRiver ? styles.riverPin : styles.streamPin)}>
                <Text style={styles.pinIcon}>{isWaterfall ? "💧" : isRiver ? "🌊" : "•"}</Text>
              </View>
            </MapLibreGL.PointAnnotation>
          );
        })}

        {activeRouteGeoJSON && (
          <MapLibreGL.ShapeSource id="route-src" shape={activeRouteGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: "#00bfff", lineWidth: 4,
                lineCap: "round", lineJoin: "round",
                lineDasharray: activeRoute?.mode === "foot" ? [2, 2] : [1, 0],
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {turbines.map(t => t.location ? (
          <MapLibreGL.PointAnnotation key={`t-${t.id}`} id={`t-${t.id}`} coordinate={[t.location.longitude, t.location.latitude]}>
            <View style={styles.turbinePin}><Text style={styles.turbineIcon}>⚡</Text></View>
          </MapLibreGL.PointAnnotation>
        ) : null)}
      </MapLibreGL.MapView>

      <TouchableOpacity style={styles.styleBtn} onPress={cycleMapStyle}>
        <Text style={styles.styleIcon}>{STYLE_ICON[mapStyle]}</Text>
        <Text style={styles.styleLabel}>{STYLE_LABEL[mapStyle]}</Text>
      </TouchableOpacity>

      {showDirections && selectedWay && (
        <Animated.View style={[styles.directionsPanel, { height: panelY }]} {...panResponder.panHandlers}>
          <View style={styles.dragBarWrap}><View style={styles.dragBar} /></View>
          <View style={styles.directionsPanelHeader}>
            <View style={styles.directionsPanelLeft}>
              <Text style={styles.directionsPanelTitle}>{selectedWay.name || "Cours d'eau"}</Text>
              <Text style={[styles.directionsPanelSub, { color: getDebitColor(selectedWay.type, selectedWay.width) }]}>
                {getDebit(selectedWay.type, selectedWay.width)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeDirections}>
              <Text style={styles.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          {loadingRoute ? (
            <View style={styles.loadingWrap}><Text style={styles.loadingTxt}>Calcul des itinéraires...</Text></View>
          ) : routeOptions.length === 0 ? (
            <View style={styles.loadingWrap}><Text style={styles.loadingTxt}>Itinéraire indisponible (réseau ?)</Text></View>
          ) : (
            <View style={styles.routeOptions}>
              {routeOptions.map(option => (
                <TouchableOpacity key={option.mode}
                  style={[styles.routeOption, activeRoute?.mode === option.mode && styles.routeOptionActive]}
                  onPress={() => selectRoute(option)}>
                  <Text style={styles.routeOptionIcon}>{option.mode === "foot" ? "🚶" : "🚴"}</Text>
                  <View style={styles.routeOptionInfo}>
                    <Text style={styles.routeOptionMode}>{option.mode === "foot" ? "À pied" : "À vélo"}</Text>
                    <Text style={styles.routeOptionDetails}>{option.distance} · {option.duration}</Text>
                  </View>
                  {activeRoute?.mode === option.mode && (
                    <View style={styles.activeIndicator}><Text style={styles.activeIndicatorTxt}>En cours</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeRoute && (
            <View style={styles.navigationInfo}>
              <View style={styles.navDot} />
              <Text style={styles.navigationTxt}>
                {activeRoute.mode === "foot" ? "🚶 À pied" : "🚴 À vélo"} · {activeRoute.distance} · {activeRoute.duration}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  waterfallPin: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1e88e5", borderWidth: 2.5, borderColor: "#ffffff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  riverPin: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#0288d1", borderWidth: 2, borderColor: "#ffffff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1.5 }, elevation: 3 },
  streamPin: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#78909c", borderWidth: 1.5, borderColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  pinIcon: { fontSize: 14, color: "#ffffff", fontWeight: "bold" },
  turbinePin: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#1DB87A", borderWidth: 2.5, borderColor: "#ffffff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  turbineIcon: { fontSize: 14 },
  styleBtn: { position: "absolute", top: 100, right: 14, backgroundColor: "rgba(10,15,26,0.92)", borderWidth: 0.5, borderColor: "#3d7eb5", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6, zIndex: 30, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  styleIcon: { fontSize: 16 },
  styleLabel: { color: "#5ba3d9", fontSize: 11, fontWeight: "500" },
  directionsPanel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#0a0f1a", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 0.5, borderColor: "#3d7eb5" },
  dragBarWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  dragBar: { width: 36, height: 4, backgroundColor: "#1a2d4a", borderRadius: 2 },
  directionsPanelHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  directionsPanelLeft: { flex: 1 },
  directionsPanelTitle: { fontSize: 15, fontWeight: "500", color: "#e8f0f8" },
  directionsPanelSub: { fontSize: 11, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#0f2040", alignItems: "center", justifyContent: "center" },
  closeBtnTxt: { fontSize: 13, color: "#6b8aaa" },
  loadingWrap: { padding: 20, alignItems: "center" },
  loadingTxt: { fontSize: 13, color: "#5ba3d9" },
  routeOptions: { paddingHorizontal: 16, gap: 8 },
  routeOption: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f1a2e", borderWidth: 0.5, borderColor: "#1a2d4a", borderRadius: 12, padding: 12, gap: 12 },
  routeOptionActive: { borderColor: "#3d7eb5", backgroundColor: "#0f2040" },
  routeOptionIcon: { fontSize: 24 },
  routeOptionInfo: { flex: 1 },
  routeOptionMode: { fontSize: 14, fontWeight: "500", color: "#e8f0f8" },
  routeOptionDetails: { fontSize: 12, color: "#6b8aaa", marginTop: 2 },
  activeIndicator: { backgroundColor: "#0a1520", borderWidth: 0.5, borderColor: "#3d7eb5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeIndicatorTxt: { fontSize: 10, color: "#5ba3d9" },
  navigationInfo: { marginHorizontal: 16, marginTop: 8, backgroundColor: "#0f2040", borderWidth: 0.5, borderColor: "#3d7eb5", borderRadius: 12, padding: 12, alignItems: "center" },
  navigationTxt: { fontSize: 13, color: "#00bfff", fontWeight: "500" },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00bfff", marginRight: 8 },
});
