// Stub web pour WaterMap.
// react-native-maps utilise des modules natifs (codegenNativeCommands) qui
// n'existent pas sur le web. Metro/Expo charge automatiquement ce fichier
// .web.tsx à la place de WaterMap.tsx quand on lance "expo start --web".
import { StyleSheet, Text, View } from "react-native";

type Props = {
  mapRef: React.RefObject<any>;
  location: { latitude: number; longitude: number } | null;
  turbines: any[];
  preloadedWaterways?: any[];
};

export default function WaterMap(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HydroTech</Text>
      <Text style={styles.txt}>
        La carte n&apos;est pas disponible sur le web.
      </Text>
      <Text style={styles.sub}>
        Lancez l&apos;app sur Expo Go (mobile) pour voir les cours d&apos;eau.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    color: "#5ba3d9",
    fontSize: 28,
    letterSpacing: 6,
    marginBottom: 16,
  },
  txt: { color: "#e8f0f8", fontSize: 14, textAlign: "center" },
  sub: { color: "#6b8aaa", fontSize: 12, textAlign: "center" },
});
