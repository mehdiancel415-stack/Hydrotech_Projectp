import { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  Callout,
  Region,
} from "react-native-maps";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0c1520" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b8aaa" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f2040" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2d3a" }],
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#0a1520" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2d4a" }],
  },
];

const SCREEN_HEIGHT = Dimensions.get("window").height;
const PANEL_MIN = 100;
const PANEL_MAX = SCREEN_HEIGHT * 0.45;
const TILE_SIZE = 0.08;

const getTileKey = (lat: number, lng: number) => {
  const tileX = Math.floor(lat / TILE_SIZE);
  const tileY = Math.floor(lng / TILE_SIZE);
  return `${tileX}_${tileY}`;
};

type WaterWay = {
  id: number;
  type: string;
  name: string;
  coords: { latitude: number; longitude: number }[];
  width?: number;
  midPoint: { latitude: number; longitude: number };
};

type RouteOption = {
  mode: "foot" | "driving";
  coords: { latitude: number; longitude: number }[];
  distance: string;
  duration: string;
};

type Props = {
  mapRef: React.RefObject<any>;
  location: { latitude: number; longitude: number } | null;
  turbines: any[];
  preloadedWaterways?: any[];
};

export default function WaterMap({
  mapRef,
  location,
  turbines,
  preloadedWaterways,
}: Props) {
  const [waterways, setWaterways] = useState<WaterWay[]>([]);
  const [selectedWay, setSelectedWay] = useState<WaterWay | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const fetchedTiles = useRef<Set<string>>(new Set());
  const routeCache = useRef<Record<string, RouteOption[]>>({});
  const isNavigating = useRef(false);
  const panelY = useRef(new Animated.Value(PANEL_MIN)).current;
  const lastY = useRef(PANEL_MIN);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      const newY = lastY.current - g.dy;
      if (newY >= PANEL_MIN && newY <= PANEL_MAX) panelY.setValue(newY);
    },
    onPanResponderRelease: (_, g) => {
      const newY = lastY.current - g.dy;
      if (g.vy < -0.5 || newY > SCREEN_HEIGHT * 0.25) {
        Animated.spring(panelY, {
          toValue: PANEL_MAX,
          useNativeDriver: false,
        }).start();
        lastY.current = PANEL_MAX;
      } else {
        Animated.spring(panelY, {
          toValue: PANEL_MIN,
          useNativeDriver: false,
        }).start();
        lastY.current = PANEL_MIN;
      }
    },
  });
  useEffect(() => {
    if (preloadedWaterways && preloadedWaterways.length > 0) {
      setWaterways(preloadedWaterways);
    }
  }, [preloadedWaterways]);

  useEffect(() => {
    if (!location) return;
    fetchWaterways(location.latitude, location.longitude);

    // Navigation basique — carte suit la position
    if (isNavigating.current && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [location]);

  const fetchWaterways = async (lat: number, lng: number) => {
    const key = getTileKey(lat, lng);
    if (fetchedTiles.current.has(key)) return;
    fetchedTiles.current.add(key);

    // Essai cache local d'abord
    try {
      const cached = await AsyncStorage.getItem(`waterways_${key}`);
      if (cached) {
        const ways: WaterWay[] = JSON.parse(cached);
        setWaterways((prev) => {
          const existingIds = new Set(prev.map((w) => w.id));
          const newWays = ways.filter((w) => !existingIds.has(w.id));
          return [...prev, ...newWays];
        });
        return;
      }
    } catch (e) {}

    // Sinon fetch depuis Overpass
    const radius = 10000;
    const query = `
    [out:json][timeout:10];
    (
      way["waterway"~"river|stream|canal|waterfall"](around:${radius},${lat},${lng});
    );
    out geom qt;
  `;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      const ways: WaterWay[] = data.elements
        .filter((el: any) => el.geometry && el.geometry.length > 1)
        .map((el: any) => {
          const coords = el.geometry.map((g: any) => ({
            latitude: g.lat,
            longitude: g.lon,
          }));
          return {
            id: el.id,
            type: el.tags?.waterway ?? "stream",
            name: el.tags?.name ?? "",
            width: el.tags?.width ? parseFloat(el.tags.width) : undefined,
            coords,
            midPoint: coords[Math.floor(coords.length / 2)],
          };
        });

      // Sauvegarde en cache
      try {
        await AsyncStorage.setItem(`waterways_${key}`, JSON.stringify(ways));
      } catch (e) {}

      setWaterways((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const newWays = ways.filter((w) => !existingIds.has(w.id));
        return [...prev, ...newWays];
      });
    } catch (e) {
      fetchedTiles.current.delete(key);
      console.log("Overpass error:", e);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    fetchWaterways(region.latitude, region.longitude);
  };

  const fetchRouteOption = async (
    way: WaterWay,
    mode: "foot" | "driving",
  ): Promise<RouteOption | null> => {
    if (!location) return null;
    try {
      const profile = mode === "foot" ? "foot" : "car";
      const url = `https://router.project-osrm.org/route/v1/${profile}/${location.longitude},${location.latitude};${way.midPoint.longitude},${way.midPoint.latitude}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        const coords = r.geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        const distanceKm = (r.distance / 1000).toFixed(1);
        const durationMin = Math.round(r.duration / 60);
        const durationStr =
          durationMin > 60
            ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}min`
            : `${durationMin} min`;
        return {
          mode,
          coords,
          distance: `${distanceKm} km`,
          duration: durationStr,
        };
      }
    } catch (e) {
      console.log("OSRM error:", e);
    }
    return null;
  };

  const openDirections = async (way: WaterWay) => {
    setSelectedWay(way);
    setShowDirections(true);
    setLoadingRoute(true);
    setRouteOptions([]);
    setActiveRoute(null);
    panelY.setValue(PANEL_MIN);
    lastY.current = PANEL_MIN;
    Animated.spring(panelY, {
      toValue: PANEL_MAX,
      useNativeDriver: false,
    }).start();
    lastY.current = PANEL_MAX;
    const cacheKey = `${way.id}`;
    if (routeCache.current[cacheKey]) {
      setRouteOptions(routeCache.current[cacheKey]);
      setLoadingRoute(false);
      return;
    }
    const [foot, driving] = await Promise.all([
      fetchRouteOption(way, "foot"),
      fetchRouteOption(way, "driving"),
    ]);
    const options = [foot, driving].filter(Boolean) as RouteOption[];
    routeCache.current[cacheKey] = options;
    setRouteOptions(options);
    setLoadingRoute(false);
  };

  const selectRoute = (option: RouteOption) => {
    setActiveRoute(option);
    isNavigating.current = true;
    mapRef.current?.fitToCoordinates(option.coords, {
      edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  };

  const closeDirections = () => {
    setShowDirections(false);
    setSelectedWay(null);
    setActiveRoute(null);
    setRouteOptions([]);
    isNavigating.current = false;
  };

  const getColor = (type: string, width?: number) => {
    if (type === "river") return "#2a6496";
    if (type === "waterfall") return "#5ba3d9";
    if (width && width > 5) return "#2a6496";
    return "#1a3a5c";
  };

  const getStrokeWidth = (type: string, width?: number) => {
    if (type === "river") return 3;
    if (width && width > 5) return 2.5;
    return 1.5;
  };

  const getDebit = (type: string, width?: number) => {
    if (type === "waterfall") return "Chute — fort débit";
    if (type === "river") return "Rivière — débit élevé";
    if (width && width > 5) return "Cours large — bon débit";
    if (width && width > 2) return "Ruisseau — débit moyen";
    return "Ruisseau — débit faible";
  };

  const getDebitColor = (type: string, width?: number) => {
    if (type === "waterfall" || type === "river") return "#5ba3d9";
    if (width && width > 5) return "#EF9F27";
    return "#6b8aaa";
  };
  const filterMarkers = (ways: WaterWay[]) => {
    const seen: { name: string; lat: number; lng: number }[] = [];
    return ways
      .filter((w) => w.name || w.type === "waterfall")
      .filter((w) => {
        if (!w.name) return true;
        const existing = seen.find(
          (s) =>
            s.name === w.name &&
            Math.abs(s.lat - w.midPoint.latitude) < 0.045 &&
            Math.abs(s.lng - w.midPoint.longitude) < 0.045,
        );
        if (existing) return false;
        seen.push({
          name: w.name,
          lat: w.midPoint.latitude,
          lng: w.midPoint.longitude,
        });
        return true;
      });
  };
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
customMapStyle={MAP_STYLE}
loadingEnabled={true}
loadingIndicatorColor="#3d7eb5"
loadingBackgroundColor="#0a0f1a"       showsUserLocation={true}
        showsCompass={false}
        showsScale={false}
        onRegionChangeComplete={onRegionChangeComplete}
        initialRegion={{
          latitude: location?.latitude ?? 47.2184,
          longitude: location?.longitude ?? -1.5536,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {waterways.map((w) => (
          <Polyline
            key={w.id}
            coordinates={w.coords}
            strokeColor={getColor(w.type, w.width)}
            strokeWidth={getStrokeWidth(w.type, w.width)}
          />
        ))}

        {filterMarkers(waterways).map((w) => (
          <Marker
            key={`m-${w.id}`}
            coordinate={w.midPoint}
            pinColor={getDebitColor(w.type, w.width)}
          >
            <Callout tooltip={true} onPress={() => openDirections(w)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>
                  {w.name || "Cours d'eau"}
                </Text>
                <Text
                  style={[
                    styles.calloutDebit,
                    { color: getDebitColor(w.type, w.width) },
                  ]}
                >
                  {getDebit(w.type, w.width)}
                </Text>
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => openDirections(w)}
                >
                  <Text style={styles.directionsBtnTxt}>Directions →</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}

        {activeRoute && (
          <Polyline
            coordinates={activeRoute.coords}
            strokeColor="#00bfff"
            strokeWidth={4}
            lineDashPattern={activeRoute.mode === "foot" ? [10, 8] : undefined}
          />
        )}

        {turbines.map((t) =>
          t.location ? (
            <Marker
              key={`t-${t.id}`}
              coordinate={t.location}
              title={t.name}
              description={`${t.power}W · ${t.status}`}
              pinColor="#1DB87A"
            />
          ) : null,
        )}
      </MapView>

      {showDirections && selectedWay && (
        <Animated.View
          style={[styles.directionsPanel, { height: panelY }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragBarWrap}>
            <View style={styles.dragBar} />
          </View>
          <View style={styles.directionsPanelHeader}>
            <View style={styles.directionsPanelLeft}>
              <Text style={styles.directionsPanelTitle}>
                {selectedWay.name || "Cours d'eau"}
              </Text>
              <Text
                style={[
                  styles.directionsPanelSub,
                  { color: getDebitColor(selectedWay.type, selectedWay.width) },
                ]}
              >
                {getDebit(selectedWay.type, selectedWay.width)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeDirections}>
              <Text style={styles.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingRoute ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingTxt}>Calcul des itinéraires...</Text>
            </View>
          ) : (
            <View style={styles.routeOptions}>
              {routeOptions.map((option) => (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.routeOption,
                    activeRoute?.mode === option.mode &&
                      styles.routeOptionActive,
                  ]}
                  onPress={() => selectRoute(option)}
                >
                  <Text style={styles.routeOptionIcon}>
                    {option.mode === "foot" ? "🚶" : "🚗"}
                  </Text>
                  <View style={styles.routeOptionInfo}>
                    <Text style={styles.routeOptionMode}>
                      {option.mode === "foot" ? "À pied" : "En voiture"}
                    </Text>
                    <Text style={styles.routeOptionDetails}>
                      {option.distance} · {option.duration}
                    </Text>
                  </View>
                  {activeRoute?.mode === option.mode && (
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeIndicatorTxt}>En cours</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeRoute && (
            <View style={styles.navigationInfo}>
              <View style={styles.navDot} />
              <Text style={styles.navigationTxt}>
                {activeRoute.mode === "foot" ? "🚶 À pied" : "🚗 En voiture"} ·{" "}
                {activeRoute.distance} · {activeRoute.duration}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    backgroundColor: "#0a0f1a",
    borderWidth: 0.5,
    borderColor: "#3d7eb5",
    borderRadius: 12,
    padding: 12,
    minWidth: 180,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#e8f0f8",
    marginBottom: 3,
  },
  calloutDebit: { fontSize: 11, marginBottom: 10 },
  directionsBtn: {
    backgroundColor: "#0f2040",
    borderWidth: 0.5,
    borderColor: "#3d7eb5",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  directionsBtnTxt: { fontSize: 12, color: "#5ba3d9", fontWeight: "500" },
  directionsPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0a0f1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    borderColor: "#3d7eb5",
  },
  dragBarWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  dragBar: {
    width: 36,
    height: 4,
    backgroundColor: "#1a2d4a",
    borderRadius: 2,
  },
  directionsPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  directionsPanelLeft: { flex: 1 },
  directionsPanelTitle: { fontSize: 15, fontWeight: "500", color: "#e8f0f8" },
  directionsPanelSub: { fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f2040",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnTxt: { fontSize: 13, color: "#6b8aaa" },
  loadingWrap: { padding: 20, alignItems: "center" },
  loadingTxt: { fontSize: 13, color: "#5ba3d9" },
  routeOptions: { paddingHorizontal: 16, gap: 8 },
  routeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1a2e",
    borderWidth: 0.5,
    borderColor: "#1a2d4a",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  routeOptionActive: { borderColor: "#3d7eb5", backgroundColor: "#0f2040" },
  routeOptionIcon: { fontSize: 24 },
  routeOptionInfo: { flex: 1 },
  routeOptionMode: { fontSize: 14, fontWeight: "500", color: "#e8f0f8" },
  routeOptionDetails: { fontSize: 12, color: "#6b8aaa", marginTop: 2 },
  activeIndicator: {
    backgroundColor: "#0a1520",
    borderWidth: 0.5,
    borderColor: "#3d7eb5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeIndicatorTxt: { fontSize: 10, color: "#5ba3d9" },
  navigationInfo: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#0f2040",
    borderWidth: 0.5,
    borderColor: "#3d7eb5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  navigationTxt: { fontSize: 13, color: "#00bfff", fontWeight: "500" },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00bfff",
    marginRight: 8,
  },
});
