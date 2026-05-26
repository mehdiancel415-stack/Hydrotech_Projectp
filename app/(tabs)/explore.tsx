// Route auto-découverte par expo-router. Elle n'est pas utilisée par
// HydroTech (le tab bar est masqué), donc on la rend inerte pour éviter
// de tirer dans le bundle les imports du template Expo (Collapsible,
// ParallaxScrollView, IconSymbol, expo-symbols, etc.) qui ne servent à rien.
export default function _UnusedExploreRoute() {
  return null;
}
