import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  BebasNeue_400Regular,
} from "@expo-google-fonts/bebas-neue";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { TurbinesProvider } from "../contexts/TurbinesContext";
import { theme } from "../constants/theme";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    BebasNeue_400Regular,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      (async () => {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("overlay-swipe");
          await NavigationBar.setBackgroundColorAsync('#F0F4F8');
          await NavigationBar.setButtonStyleAsync("dark");
        } catch (e) {
          console.log("NavigationBar config error:", e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.fontLoading} />;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
      <TurbinesProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ contentStyle: { backgroundColor: '#F0F4F8' }, headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
          <StatusBar style="dark" hidden={false} />
        </ThemeProvider>
      </TurbinesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F4F8' },
  fontLoading: { flex: 1, backgroundColor: '#F0F4F8' },
});
