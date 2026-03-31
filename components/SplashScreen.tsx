import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { preloadWaterways } from "./MapCacheManager";

const { width, height } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
  location?: { latitude: number; longitude: number } | null;
  onWaterwaysLoaded?: (ways: any[]) => void;
};

export default function SplashScreen({
  onFinish,
  location,
  onWaterwaysLoaded,
}: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.15)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo fond + zoom léger simultané — très fluide
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),

      // Titre + sous-titre glissent ensemble
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // Barre apparaît
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),

      // Chargement réaliste
      Animated.timing(loadingWidth, {
        toValue: 0.35,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.delay(250),
      Animated.timing(loadingWidth, {
        toValue: 0.65,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.delay(350),
      Animated.timing(loadingWidth, {
        toValue: 0.85,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.delay(400),
      Animated.timing(loadingWidth, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),

      Animated.delay(500),

      // Disparition douce
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);
  useEffect(() => {
  if (location) {
    preloadWaterways(
      location.latitude,
      location.longitude,
      (ways) => onWaterwaysLoaded?.(ways)
    );
  }
}, [location]);

  const barWidth = loadingWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* LOGO */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/hydro.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* TITRE */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text style={styles.title}>HYDROTECH</Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Énergie hydraulique portable
        </Animated.Text>
      </Animated.View>

      {/* BARRE DE CHARGEMENT */}
      <Animated.View
        style={[styles.loadingBarWrap, { opacity: loadingOpacity }]}
      >
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingFill, { width: barWidth }]} />
          <Animated.View style={[styles.loadingShimmer, { width: barWidth }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0f1a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 220, height: 220 },
  title: {
    fontSize: 30,
    fontWeight: "500",
    color: "#5ba3d9",
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b8aaa",
    letterSpacing: 2,
  },
  loadingBarWrap: {
    width: 180,
    marginTop: 8,
  },
  loadingBar: {
    width: "100%",
    height: 2,
    backgroundColor: "#1a2d4a",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  loadingFill: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#3d7eb5",
    borderRadius: 2,
  },
  loadingShimmer: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#5ba3d9",
    borderRadius: 2,
    opacity: 0.3,
  },
});
