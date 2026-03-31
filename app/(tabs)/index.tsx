import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polygon } from "react-native-svg";
import NotificationManager from "../../components/NotificationManager";
import SettingsScreen from "../../components/SettingsScreen";
import SplashScreen from "../../components/SplashScreen";
import Toast from "../../components/Toast";
import TurbinePanel from "../../components/TurbinePanel";
import WaterMap from "../../components/WaterMap";
import { theme } from "../../constants/theme";
import BluetoothScanner from "../BluetoothScanner";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_MIN = 90;
const PANEL_MAX = SCREEN_HEIGHT * 0.75;

export default function HomeScreen() {
  const [turbines, setTurbines] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [activeTurbine, setActiveTurbine] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [preloadedWaterways, setPreloadedWaterways] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };
  const panelY = useRef(new Animated.Value(PANEL_MIN)).current;
  const lastY = useRef(PANEL_MIN);
  const turbineScrollRef = useRef<ScrollView>(null);
  const mapRef = useRef<any>(null);
  const compassBottom = panelY.interpolate({
    inputRange: [PANEL_MIN, PANEL_MAX],
    outputRange: [PANEL_MIN + 10, PANEL_MAX + 10],
    extrapolate: "clamp",
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Low,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (loc) =>
            setLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }),
        );
      }
    })();
  }, []);
  useEffect(() => {
    loadTurbines();
  }, []);

  useEffect(() => {
    if (dataLoaded) saveTurbines();
  }, [turbines]);

  const loadTurbines = async () => {
    try {
      const saved = await AsyncStorage.getItem("hydrotech_turbines");
      if (saved) {
        setTurbines(JSON.parse(saved));
      }
    } catch (e) {
      console.log("Load error:", e);
    }
    setDataLoaded(true);
  };

  const saveTurbines = async () => {
    try {
      await AsyncStorage.setItem(
        "hydrotech_turbines",
        JSON.stringify(turbines),
      );
    } catch (e) {
      console.log("Save error:", e);
    }
  };

  const goToMyLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800,
      );
    }
  };

  const addTurbine = () => {
    setShowScanner(true);
  };

  const handleDeviceConnected = (device: { id: string; name: string }) => {
    const newTurbine = {
      id: Date.now(),
      name: device.name,
      status: 'En marche',
      power: Math.floor(Math.random() * 10) + 10,
      energy: 0,
      connectedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      location: location ? {
        latitude: location.latitude + (Math.random() - 0.5) * 0.01,
        longitude: location.longitude + (Math.random() - 0.5) * 0.01,
      } : null,
      batteries: [],
    };
    const updated = [...turbines, newTurbine];
    setTurbines(updated);
    setTimeout(() => {
      setActiveTurbine(updated.length - 1);
      turbineScrollRef.current?.scrollTo({
        x: (updated.length - 1) * SCREEN_WIDTH,
        animated: true,
      });
      Animated.spring(panelY, {
        toValue: PANEL_MIN,
        useNativeDriver: false,
      }).start();
      lastY.current = PANEL_MIN;
    }, 100);
  };
  const updateBatteries = (turbineId: number, batteries: any[]) => {
    setTurbines((prev) =>
      prev.map((t) => (t.id === turbineId ? { ...t, batteries } : t)),
    );
  };
  const removeTurbine = (id: number) => {
    const updated = turbines.filter((t) => t.id !== id);
    setTurbines(updated);
    setActiveTurbine(0);
    turbineScrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      return (
        Math.abs(gesture.dy) > Math.abs(gesture.dx) && Math.abs(gesture.dy) > 5
      );
    },
    onPanResponderMove: (_, gesture) => {
      const newY = lastY.current - gesture.dy;
      if (newY >= PANEL_MIN && newY <= PANEL_MAX) panelY.setValue(newY);
    },
    onPanResponderRelease: (_, gesture) => {
      const newY = lastY.current - gesture.dy;
      if (gesture.vy < -0.5 || newY > SCREEN_HEIGHT * 0.4) {
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

  const handleTurbineScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveTurbine(index);
  };

  return (
    <View style={styles.container}>
      <WaterMap
        mapRef={mapRef}
        location={location}
        turbines={turbines}
        preloadedWaterways={preloadedWaterways}
      />

      {/* BADGE BLE */}
      {turbines.length > 0 && (
        <View style={styles.topLeft}>
          <View style={styles.bleBadge}>
            <View style={styles.bleDot} />
            <Text style={styles.bleTxt}>BLE</Text>
          </View>
          {turbines.length > 1 && (
            <View style={styles.turbineIndicator}>
              <Text style={styles.turbineIndicatorTxt}>
                {activeTurbine + 1} / {turbines.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* BOUTONS HAUT DROITE */}
      <View style={styles.topRight}>
        {turbines.length > 0 && (
          <TouchableOpacity style={styles.topBtn} onPress={addTurbine}>
            <Text style={styles.topBtnTxt}>+</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.topBtnTxt}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* BOUTON BOUSSOLE */}
      <Animated.View
        style={[
          styles.compassBtn,
          { bottom: turbines.length > 0 ? compassBottom : 90 } as any,
        ]}
      >
        <TouchableOpacity onPress={goToMyLocation} style={styles.compassInner}>
          <Svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            style={{ transform: [{ rotate: "30deg" }] }}
          >
            <Polygon
              points="12,2 20,22 12,17 4,22"
              fill="#5ba3d9"
              opacity={0.95}
            />
          </Svg>
        </TouchableOpacity>
      </Animated.View>
      {/* BOUTON + ACCUEIL */}
      {turbines.length === 0 && (
        <TouchableOpacity style={styles.plusBtn} onPress={addTurbine}>
          <Text style={styles.plusTxt}>+</Text>
        </TouchableOpacity>
      )}

      {/* PANNEAU DONNÉES */}
      {turbines.length > 0 && (
        <Animated.View
          style={[styles.panel, { height: panelY }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragBarWrap}>
            <View style={styles.dragBar} />
          </View>

          <View style={styles.miniRow}>
            <View style={styles.miniRing}>
              <Text style={styles.miniPct}>
                {Math.round(
                  (turbines[activeTurbine]?.batteries.reduce(
                    (s: number, b: any) =>
                      s + (b.capacity * b.percentage) / 100,
                    0,
                  ) /
                    turbines[activeTurbine]?.batteries.reduce(
                      (s: number, b: any) => s + b.capacity,
                      0,
                    )) *
                  100,
                )}
                %
              </Text>
            </View>
            <View style={styles.miniStats}>
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipTxt}>
                    {turbines[activeTurbine]?.power} W
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipTxt}>
                    {turbines[activeTurbine]?.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.etaTxt}>{turbines[activeTurbine]?.name}</Text>
            </View>
            {turbines.length > 1 && (
              <View style={styles.turbineDots}>
                {turbines.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setActiveTurbine(i);
                      turbineScrollRef.current?.scrollTo({
                        x: i * SCREEN_WIDTH,
                        animated: true,
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.turbineDot,
                        i === activeTurbine && styles.turbineDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <ScrollView
            ref={turbineScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleTurbineScroll}
            scrollEventThrottle={16}
            style={styles.turbineScroll}
          >
            {turbines.map((t) => (
              <TurbinePanel
                key={t.id}
                turbine={{
                  ...t,
                  onDelete: removeTurbine,
                  onUpdateBatteries: updateBatteries,
                }}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}
      <BluetoothScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onConnect={(device, bleData) => handleDeviceConnected(device, bleData)}
      />
      <SettingsScreen
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        turbines={turbines}
        onUpdateBatteries={updateBatteries}
        onTestToast={() => showToast("🔋 Batterie 1 de Turbine 1 est pleine !")}
      />
      <NotificationManager
        turbines={turbines}
        onBatteryFull={(turbineName, batteryName) => {
          showToast(`🔋 ${batteryName} de ${turbineName} est pleine !`);
        }}
      />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      {showSplash && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
          location={location}
          onWaterwaysLoaded={(ways) => setPreloadedWaterways(ways)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topLeft: {
    position: "absolute",
    top: 52,
    left: 14,
    flexDirection: "row",
    gap: 8,
    zIndex: 20,
  },
  topRight: {
    position: "absolute",
    top: 52,
    right: 14,
    flexDirection: "row",
    gap: 8,
    zIndex: 20,
  },
  topBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(10,15,26,0.88)",
    borderWidth: 0.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topBtnTxt: { color: theme.accent, fontSize: 16 },
  bleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10,15,26,0.88)",
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accent,
  },
  bleTxt: { color: theme.textPrimary, fontSize: 10, letterSpacing: 1 },
  turbineIndicator: {
    backgroundColor: "rgba(10,15,26,0.88)",
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  turbineIndicatorTxt: {
    color: theme.textPrimary,
    fontSize: 10,
    letterSpacing: 1,
  },
  plusBtn: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1a3a5c",
    borderWidth: 1,
    borderColor: "#3d7eb5",
    alignItems: "center",
    justifyContent: "center",
  },
  plusTxt: { color: "#5ba3d9", fontSize: 32, lineHeight: 36 },
  compassBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(10,15,26,0.92)",
    borderWidth: 0.5,
    borderColor: "#3d7eb5",
    zIndex: 50,
  },
  compassInner: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 2,
  },
  compassTxt: {
    color: "#5ba3d9",
    fontSize: 24,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "300",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    borderColor: theme.primary,
  },
  dragBarWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  dragBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
  },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  miniRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPct: { color: theme.textPrimary, fontSize: 11, fontWeight: "500" },
  miniStats: { flex: 1 },
  chipRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  chip: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipTxt: { color: theme.textPrimary, fontSize: 11 },
  etaTxt: { color: theme.textSecondary, fontSize: 10 },
  turbineDots: { flexDirection: "column", gap: 4 },
  turbineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.border,
  },
  turbineDotActive: { backgroundColor: theme.accent, height: 12 },
  turbineScroll: { flex: 1 },
});
