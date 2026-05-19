import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapLibreGL from "@maplibre/maplibre-react-native";
import Svg, { Polygon, Path, Circle } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { theme, fontFamily, radius } from "../../constants/theme";
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

const ROUTE_CACHE_KEY = "hydrotech_route_cache_v2";
const STYLE_PREF_KEY = "hydrotech_map_style_v3";

// === STYLES DE CARTE ===
type StyleId = "plan" | "satellite" | "hybride";

// Plan = Liberty (OSM, plus coloré que Positron — moins fade)
const STYLE_PLAN: any = "https://tiles.openfreemap.org/styles/liberty";

function makeRasterStyle(urls: string[], attrib: string): any {
  return {
    version: 8 as const,
    sources: {
      tiles: { type: "raster" as const, tiles: urls, tileSize: 256, attribution: attrib, maxzoom: 19 },
    },
    layers: [{ id: "tiles", type: "raster" as const, source: "tiles" }],
  };
}

const STYLE_SATELLITE = makeRasterStyle(
  [
    "https://mt0.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
  ],
  "© Google",
);

const STYLE_HYBRIDE = makeRasterStyle(
  [
    "https://mt0.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
  ],
  "© Google",
);

const STYLES: Record<StyleId, any> = { plan: STYLE_PLAN, satellite: STYLE_SATELLITE, hybride: STYLE_HYBRIDE };
const STYLE_LABELS: Record<StyleId, string> = { plan: "Plan", satellite: "Satellite", hybride: "Hybride" };
const STYLE_ICONS: Record<StyleId, string> = { plan: "🗺", satellite: "🛰", hybride: "🌍" };
const STYLE_NEXT: Record<StyleId, StyleId> = { hybride: "satellite", satellite: "plan", plan: "hybride" };

// ─── Animated turbine marker ──────────────────────────────────────────────
function AnimatedTurbineMarker({ power }: { power: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.6, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    opacity.value = withRepeat(withSequence(withTiming(0, { duration: 900 }), withTiming(0.5, { duration: 900 })), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));

  return (
    <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{
        position: "absolute", width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.teal,
      }, ringStyle]} />
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.bgElevated,
        borderWidth: 2, borderColor: colors.teal,
        alignItems: "center", justifyContent: "center",
        shadowColor: colors.teal, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
      }}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={colors.teal} />
        </Svg>
      </View>
      <View style={{
        position: "absolute", bottom: -2,
        backgroundColor: colors.bgElevated, borderRadius: 6,
        paddingHorizontal: 5, paddingVertical: 1,
        borderWidth: 1, borderColor: colors.borderTeal,
      }}>
        <Text style={{ fontFamily: fontFamily.monoBold, fontSize: 8, color: colors.teal }}>
          {Math.round(power)}W
        </Text>
      </View>
    </View>
  );
}

// Camera défaut figée hors du composant — référence stable, jamais re-créée
const DEFAULT_CAM_SETTINGS = {
  centerCoordinate: [2.3522, 46.5] as [number, number],
  zoomLevel: 5.5,
};

type RouteOption = {
  mode: "foot" | "car";
  coords: { latitude: number; longitude: number }[];
  distance: string;
  duration: string;
};

async function loadRouteCache(): Promise<Record<string, RouteOption[]>> {
  try { const r = await AsyncStorage.getItem(ROUTE_CACHE_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
async function saveRouteCache(c: Record<string, RouteOption[]>) {
  try { await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

export default function MapScreen() {
  const { turbines } = useTurbines();
  const cameraRef = useRef<any>(null);
  const initialCameraSet = useRef(false);
  const userMovedMap = useRef(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedWf, setSelectedWf] = useState<WaterfallWithScore | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [forecast, setForecast] = useState<{ rainLast7days: number; impact: string; label: string } | null>(null);
  const [mapStyle, setMapStyle] = useState<StyleId>("hybride");
  const routeCache = useRef<Record<string, RouteOption[]>>({});

  const waterfalls = useMemo<WaterfallWithScore[]>(
    () => ALL_WATERFALLS.map((w) => ({ ...w, score: staticScore(w) })),
    [],
  );

  const waterfallsGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: waterfalls.map((w) => ({
      type: "Feature" as const,
      properties: { id: w.id, name: w.name, score: w.score, color: scoreColor(w.score) },
      geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
    })),
  }), [waterfalls]);

  useEffect(() => {
    loadRouteCache().then((c) => { routeCache.current = c; });
    AsyncStorage.getItem(STYLE_PREF_KEY).then((s) => {
      if (s === "plan" || s === "satellite" || s === "hybride") setMapStyle(s);
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
    if (!location || initialCameraSet.current || userMovedMap.current || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [location.longitude, location.latitude],
      zoomLevel: 12,
      animationDuration: 0,
    });
    initialCameraSet.current = true;
  }, [location]);

  const cycleStyle = () => {
    const next = STYLE_NEXT[mapStyle];
    setMapStyle(next);
    AsyncStorage.setItem(STYLE_PREF_KEY, next).catch(() => {});
  };

  const goToMyLocation = async () => {
    let loc = location;
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const r = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      loc = { latitude: r.coords.latitude, longitude: r.coords.longitude };
      setLocation(loc);
      initialCameraSet.current = true;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: [loc.longitude, loc.latitude],
      zoomLevel: 14, animationDuration: 800,
    });
  };

  const zoomIn = () => {
    cameraRef.current?.zoomTo?.((cameraRef.current?.getZoom?.() ?? 12) + 1, 300);
  };
  const zoomOut = () => {
    cameraRef.current?.zoomTo?.((cameraRef.current?.getZoom?.() ?? 12) - 1, 300);
  };

  const onPinPress = async (id: number) => {
    const w = waterfalls.find((x) => x.id === id);
    if (!w) return;
    setSelectedWf(w);
    setRoutes([]); setActiveRoute(null);
    cameraRef.current?.setCamera({ centerCoordinate: [w.lng, w.lat], zoomLevel: 14, animationDuration: 600 });
    fetchRiverForecast(w.lat, w.lng).then((f) => f && setForecast(f));
    const cacheKey = `${w.id}`;
    if (routeCache.current[cacheKey]) {
      setRoutes(routeCache.current[cacheKey]);
      return;
    }
    if (!location) return;
    setRouteLoading(true);
    const fetchRoute = async (mode: "foot" | "car"): Promise<RouteOption | null> => {
      try {
        const url = `https://router.project-osrm.org/route/v1/${mode}/${location.longitude},${location.latitude};${w.lng},${w.lat}?overview=full&geometries=geojson`;
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
    if (opts.length > 0) {
      routeCache.current[cacheKey] = opts;
      saveRouteCache(routeCache.current);
    }
    setRoutes(opts);
    setRouteLoading(false);
  };

  const selectRoute = (r: RouteOption) => {
    setActiveRoute(r);
    if (r.coords.length === 0 || !cameraRef.current) return;
    const lats = r.coords.map((c) => c.latitude);
    const lngs = r.coords.map((c) => c.longitude);
    cameraRef.current.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      [120, 50, 280, 50], 600,
    );
  };

  const closeOverlay = () => { setSelectedWf(null); setRoutes([]); setActiveRoute(null); setForecast(null); };

  const activeRouteGeoJSON = activeRoute ? {
    type: "Feature" as const, properties: {},
    geometry: { type: "LineString" as const, coordinates: activeRoute.coords.map((c) => [c.longitude, c.latitude]) },
  } : null;

  const isSatellite = mapStyle === "satellite" || mapStyle === "hybride";

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        mapStyle={STYLES[mapStyle]}
        logoEnabled={false}
        attributionEnabled={true}
        attributionPosition={{ bottom: 90, left: 8 }}
        compassEnabled={false}
        onRegionDidChange={(e: any) => {
          if (e?.properties?.isUserInteraction) {
            userMovedMap.current = true;
          }
        }}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={DEFAULT_CAM_SETTINGS}
          followUserLocation={false}
        />
        {location && (
          <MapLibreGL.PointAnnotation
            id="user-location-dot"
            coordinate={[location.longitude, location.latitude]}
          >
            <View style={styles.userDotWrap}>
              <View style={styles.userDotPulse} />
              <View style={styles.userDot} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        <MapLibreGL.ShapeSource
          id="wf-src"
          shape={waterfallsGeoJSON as any}
          onPress={(e: any) => {
            const f = e?.features?.[0];
            if (f?.properties?.id) onPinPress(f.properties.id);
          }}
        >
          <MapLibreGL.CircleLayer
            id="wf-halo"
            style={{
              circleRadius: ["interpolate", ["linear"], ["zoom"], 6, 5, 10, 8, 14, 13],
              circleColor: "#000000",
              circleOpacity: 0.4,
              circleBlur: 0.5,
            }}
          />
          <MapLibreGL.CircleLayer
            id="wf-circles"
            style={{
              circleRadius: ["interpolate", ["linear"], ["zoom"], 6, 4, 10, 6, 14, 9],
              circleColor: ["get", "color"],
              circleStrokeColor: "#ffffff",
              circleStrokeWidth: 2,
              circleOpacity: 0.95,
            }}
          />
        </MapLibreGL.ShapeSource>

        {activeRouteGeoJSON && (
          <MapLibreGL.ShapeSource id="route-src" shape={activeRouteGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-glow"
              style={{
                lineColor: "#3b82f6",
                lineWidth: 8,
                lineOpacity: 0.3,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: isSatellite ? "#60a5fa" : theme.primary,
                lineWidth: 4,
                lineCap: "round",
                lineJoin: "round",
                lineDasharray: activeRoute?.mode === "foot" ? [2, 2] : [1, 0],
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {turbines.map((t) => t.location ? (
          <MapLibreGL.PointAnnotation
            key={`t-${t.id}`} id={`t-${t.id}`}
            coordinate={[t.location.longitude, t.location.latitude]}
          >
            <AnimatedTurbineMarker power={t.power} />
          </MapLibreGL.PointAnnotation>
        ) : null)}
      </MapLibreGL.MapView>

      {/* === HEADER GLASS CARD === */}
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

      {/* === ZOOM CONTROLS === */}
      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={zoomIn} activeOpacity={0.7}>
          <Text style={styles.ctrlIcon}>+</Text>
        </TouchableOpacity>
        <View style={styles.ctrlSeparator} />
        <TouchableOpacity style={styles.ctrlBtn} onPress={zoomOut} activeOpacity={0.7}>
          <Text style={styles.ctrlIcon}>−</Text>
        </TouchableOpacity>
      </View>

      {/* === LOCATION BUTTON === */}
      <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation} activeOpacity={0.7}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M12 2 L20 22 L12 17 L4 22 Z"
            fill={theme.accent}
            stroke="#ffffff"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </Svg>
      </TouchableOpacity>

      {/* === TURBINE STATS === */}
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

      {/* === BOTTOM SHEET === */}
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
                  {selectedWf.height ? `${selectedWf.height}m · ` : ""}
                  {selectedWf.lat.toFixed(3)}, {selectedWf.lng.toFixed(3)}
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
    backgroundColor: "rgba(15,22,38,0.88)",
    borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent,
    shadowColor: theme.accent, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  brandLabel: { fontFamily: fontFamily.semibold, fontSize: 9, letterSpacing: 2, color: theme.textMuted, textTransform: "uppercase" },
  brandTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: theme.textPrimary, marginTop: 1, letterSpacing: -0.3 },
  styleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: theme.accent + "1A",
    borderWidth: 0.5, borderColor: theme.accent + "55",
    borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  styleIcon: { fontSize: 14 },
  styleLbl: { fontFamily: fontFamily.semibold, fontSize: 11, color: theme.accent },

  rightControls: {
    position: "absolute", right: 16, top: 130,
    backgroundColor: "rgba(15,22,38,0.92)",
    borderRadius: 14, overflow: "hidden",
    borderWidth: 0.5, borderColor: theme.border,
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctrlBtn: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
  },
  ctrlIcon: {
    fontFamily: fontFamily.semibold, fontSize: 20, color: theme.textPrimary,
    lineHeight: 22,
  },
  ctrlSeparator: { height: 0.5, backgroundColor: theme.border },

  locBtn: {
    position: "absolute", right: 16, bottom: 110,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(15,22,38,0.95)",
    borderWidth: 1, borderColor: theme.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },

  userDotWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  userDotPulse: {
    position: "absolute",
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#3b82f6",
    opacity: 0.25,
  },
  userDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#3b82f6",
    borderWidth: 2.5, borderColor: "#ffffff",
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },

  statsOverlay: {
    position: "absolute", left: 16, right: 16, bottom: 100,
    flexDirection: "row",
    backgroundColor: "rgba(15,22,38,0.92)",
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontFamily: fontFamily.monoBold, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.5 },
  statLbl: { fontFamily: fontFamily.semibold, fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  sheet: {
    position: "absolute", left: 16, right: 16, bottom: 96,
    backgroundColor: theme.bgCard,
    borderRadius: 24,
    borderWidth: 0.5, borderColor: theme.border,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    gap: 10,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: "center",
    marginTop: 4, marginBottom: 6,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetHeadLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  scorePill: {
    width: 54, height: 54, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  scoreVal: { fontFamily: fontFamily.monoBold, fontSize: 20, letterSpacing: -0.5 },
  scoreLbl: { fontFamily: fontFamily.semibold, fontSize: 8, letterSpacing: 1, color: theme.textMuted, textTransform: "uppercase", marginTop: 2 },
  sheetTitle: { fontFamily: fontFamily.semibold, fontSize: 16, color: theme.textPrimary, letterSpacing: -0.3 },
  sheetMeta: { fontFamily: fontFamily.monoRegular, fontSize: 11, color: theme.textSecondary, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.bgChip, alignItems: "center", justifyContent: "center" },
  closeTxt: { fontFamily: fontFamily.medium, fontSize: 14, color: theme.textSecondary },

  forecastRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: theme.bgChip, borderRadius: 12, padding: 10,
  },
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
  routeBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accent + "12",
  },
  routeIcon: { fontSize: 22 },
  routeMid: { flex: 1 },
  routeMode: { fontFamily: fontFamily.semibold, fontSize: 13, color: theme.textPrimary, letterSpacing: -0.2 },
  routeMeta: { fontFamily: fontFamily.monoRegular, fontSize: 10, color: theme.textSecondary, marginTop: 2 },
});
