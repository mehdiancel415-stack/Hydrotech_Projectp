import { Tabs } from "expo-router";
import { theme } from "../../constants/theme";
import TabBar from "../../components/ui/TabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="logs" />
      <Tabs.Screen name="config" />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
