import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { preloadWaterways } from "./MapCacheManager";

const DURATION = 5000; // 5 secondes

type Props = {
  onFinish: () => void;
  location?: { latitude: number; longitude: number } | null;
  onWaterwaysLoaded?: (ways: any[]) => void;
};

export default function SplashScreen({ onFinish, location, onWaterwaysLoaded }: Props) {
  const barProgress   = useRef(new Animated.Value(0)).current;
  const fadeIn        = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Apparition du contenu
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Barre de chargement linéaire — 5 secondes
      Animated.timing(barProgress, {
        toValue: 1,
        duration: DURATION,
        useNativeDriver: false,
      }),
      // Disparition douce
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  useEffect(() => {
    if (location) {
      preloadWaterways(location.latitude, location.longitude, (ways) =>
        onWaterwaysLoaded?.(ways),
      );
    }
  }, [location]);

  const fillWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      <Animated.View style={[s.content, { opacity: fadeIn }]}>

        {/* Logo */}
        <View style={s.logoWrap}>
          <Image
            source={require("../assets/images/hydro1.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        {/* Nom de l'app */}
        <Text style={s.appName}>HYDROTECH</Text>
        <Text style={s.tagline}>Énergie hydraulique portable</Text>

        {/* Barre de chargement */}
        <View style={s.barWrap}>
          <View style={s.barTrack}>
            <Animated.View style={[s.barFill, { width: fillWidth }]} />
          </View>
        </View>

      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  content: {
    alignItems: "center",
    gap: 8,
  },

  // Logo
  logoWrap: {
    marginBottom: 12,
  },
  logo: {
    width: 110,
    height: 110,
  },

  // Textes
  appName: {
    fontSize: 28,
    fontFamily: "BebasNeue_400Regular",
    color: "#1B4F9B",
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Outfit_300Light",
    color: "#94A3B8",
    letterSpacing: 1.5,
    marginBottom: 36,
  },

  // Barre
  barWrap: {
    width: 180,
  },
  barTrack: {
    width: "100%",
    height: 2,
    backgroundColor: "#E2EAF4",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#1B4F9B",
    borderRadius: 2,
  },
});
