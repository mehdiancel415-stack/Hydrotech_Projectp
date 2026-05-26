import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from "react-native";
import { theme } from "../constants/theme";

type Props = { visible: boolean; onClose: () => void; onReplayOnboarding: () => void };

export default function AboutScreen({ visible, onClose, onReplayOnboarding }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
          <Text style={styles.title}>À propos</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.appIcon}>💧</Text>
            <Text style={styles.appName}>HYDROTECH</Text>
            <Text style={styles.appSlogan}>Énergie hydraulique portable</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

          <Text style={styles.section}>Comment ça marche</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              HydroTech vous accompagne pour produire de l'électricité à partir d'une turbine
              hydraulique portable installée dans un cours d'eau. L'app se connecte à votre
              turbine en Bluetooth et affiche en temps réel la tension, le courant, la puissance
              et l'état de charge de vos batteries.
            </Text>
          </View>

          <Text style={styles.section}>Légende des marqueurs</Text>
          <View style={styles.card}>
            <View style={styles.legendRow}>
              <View style={[styles.pin, { backgroundColor: "#1e88e5" }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendTitle}>Chute d'eau (cascade)</Text>
                <Text style={styles.legendSub}>Fort débit potentiel</Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.legendRow}>
              <View style={[styles.pin, { backgroundColor: "#0288d1" }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendTitle}>Rivière</Text>
                <Text style={styles.legendSub}>Cours d'eau large, débit élevé</Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.legendRow}>
              <View style={[styles.pin, { width: 14, height: 14, backgroundColor: "#78909c" }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendTitle}>Ruisseau</Text>
                <Text style={styles.legendSub}>Petit cours d'eau, débit faible à moyen</Text>
              </View>
            </View>
            <View style={styles.sep} />
            <View style={styles.legendRow}>
              <View style={[styles.pin, { backgroundColor: "#1DB87A" }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendTitle}>Vos turbines connectées</Text>
                <Text style={styles.legendSub}>Position approximative</Text>
              </View>
            </View>
          </View>

          <Text style={styles.section}>Sources de données</Text>
          <View style={styles.card}>
            <View style={styles.kvRow}><Text style={styles.kvLabel}>Carte</Text><Text style={styles.kvVal}>OpenFreeMap (OSM)</Text></View>
            <View style={styles.sep} />
            <View style={styles.kvRow}><Text style={styles.kvLabel}>Cours d'eau</Text><Text style={styles.kvVal}>Overpass / OSM</Text></View>
            <View style={styles.sep} />
            <View style={styles.kvRow}><Text style={styles.kvLabel}>Itinéraires</Text><Text style={styles.kvVal}>OSRM (foot + bike)</Text></View>
            <View style={styles.sep} />
            <View style={styles.kvRow}><Text style={styles.kvLabel}>Bluetooth</Text><Text style={styles.kvVal}>react-native-ble-plx</Text></View>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={onReplayOnboarding}>
            <Text style={styles.actionTxt}>Revoir le tutoriel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")}
          >
            <Text style={styles.actionTxt}>Crédits OpenStreetMap</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderColor: theme.border, gap: 12 },
  back: { fontSize: 14, color: theme.accent },
  title: { fontSize: 18, fontWeight: "500", color: theme.textPrimary },
  scroll: { flex: 1, padding: 16 },
  heroCard: { alignItems: "center", padding: 24, gap: 6 },
  appIcon: { fontSize: 64 },
  appName: { fontSize: 24, color: theme.accent, letterSpacing: 6, marginTop: 8 },
  appSlogan: { fontSize: 12, color: theme.textSecondary, letterSpacing: 1 },
  version: { fontSize: 11, color: theme.textSecondary, marginTop: 8 },
  section: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 14, gap: 8 },
  body: { fontSize: 13, color: theme.textPrimary, lineHeight: 20 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  legendText: { flex: 1 },
  legendTitle: { fontSize: 13, color: theme.textPrimary },
  legendSub: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#fff" },
  sep: { height: 0.5, backgroundColor: theme.border },
  kvRow: { flexDirection: "row", justifyContent: "space-between" },
  kvLabel: { fontSize: 13, color: theme.textPrimary },
  kvVal: { fontSize: 12, color: theme.textSecondary },
  actionBtn: { marginTop: 12, backgroundColor: theme.primary, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, alignItems: "center" },
  actionTxt: { fontSize: 13, color: theme.textInverse },
});
