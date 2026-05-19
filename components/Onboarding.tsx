import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useState, useRef } from "react";
import { theme } from "../constants/theme";

const W = Dimensions.get("window").width;

const SLIDES = [
  {
    icon: "🌊",
    title: "Bienvenue dans HydroTech",
    body: "Suivez la production électrique de vos turbines hydrauliques portables, où que vous soyez.",
  },
  {
    icon: "📡",
    title: "Connectez votre turbine",
    body: "Bouton + en bas à droite → 'Scanner les turbines' pour la détecter en Bluetooth, ou utilisez le mode démo pour tester l'app.",
  },
  {
    icon: "🔋",
    title: "Ajoutez vos batteries",
    body: "Glissez vers le haut sur le panneau du bas pour voir le détail de la turbine, puis ajoutez vos batteries (LiFePO4, Li-ion, Plomb).",
  },
  {
    icon: "🗺️",
    title: "Trouvez les cours d'eau",
    body: "La carte affiche les rivières et chutes d'eau autour de vous. Cliquez sur une cascade 💧 pour calculer un itinéraire à pied ou à vélo.",
  },
  {
    icon: "💾",
    title: "Mode hors-ligne",
    body: "Avant de partir en rando : Paramètres → 'Télécharger ma zone' pour avoir la carte et les cours d'eau sans réseau.",
  },
];

type Props = { visible: boolean; onFinish: () => void };

export default function Onboarding({ visible, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (i: number) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * W, animated: true });
  };

  const next = () => {
    if (index < SLIDES.length - 1) goTo(index + 1);
    else onFinish();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.skip} onPress={onFinish}>
          <Text style={styles.skipTxt}>Passer</Text>
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
          style={{ flex: 1 }}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width: W }]}>
              <Text style={styles.icon}>{s.icon}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextTxt}>
            {index < SLIDES.length - 1 ? "Suivant" : "Commencer"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingTop: 60 },
  skip: { alignSelf: "flex-end", padding: 16, marginRight: 8 },
  skipTxt: { color: theme.textSecondary, fontSize: 13 },
  slide: { paddingHorizontal: 32, alignItems: "center", justifyContent: "center", flex: 1, gap: 20 },
  icon: { fontSize: 80 },
  title: { fontSize: 24, color: theme.textPrimary, fontWeight: "300", textAlign: "center", letterSpacing: 1 },
  body: { fontSize: 14, color: theme.textSecondary, textAlign: "center", lineHeight: 22 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border },
  dotActive: { width: 24, backgroundColor: theme.accent },
  nextBtn: { marginHorizontal: 32, marginBottom: 40, backgroundColor: "#0f2040", borderWidth: 0.5, borderColor: theme.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  nextTxt: { color: theme.accent, fontSize: 15, fontWeight: "500" },
});
