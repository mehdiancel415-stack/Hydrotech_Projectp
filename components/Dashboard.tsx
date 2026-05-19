import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { theme } from "../constants/theme";
import BatteryRing from "./BatteryRing";

type Props = {
  visible: boolean;
  onClose: () => void;
  turbines: any[];
  onSelectTurbine: (index: number) => void;
};

export default function Dashboard({ visible, onClose, turbines, onSelectTurbine }: Props) {
  // Stats globales
  const totalPower = turbines.reduce((s, t) => s + (t.power || 0), 0);
  const totalEnergy = turbines.reduce((s, t) => s + (t.energy || 0), 0);
  const totalBatteries = turbines.reduce((s, t) => s + (t.batteries?.length || 0), 0);
  const totalCapAh = turbines.reduce(
    (s, t) => s + (t.batteries || []).reduce((s2: number, b: any) => s2 + b.capacity, 0),
    0,
  );
  const totalChargedAh = turbines.reduce(
    (s, t) =>
      s +
      (t.batteries || []).reduce(
        (s2: number, b: any) => s2 + (b.capacity * b.percentage) / 100,
        0,
      ),
    0,
  );
  const globalPct = totalCapAh > 0 ? (totalChargedAh / totalCapAh) * 100 : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* HERO STATS */}
          <View style={styles.hero}>
            <View style={styles.heroRingWrap}>
              <BatteryRing percentage={globalPct} size={120} strokeWidth={10} />
            </View>
            <Text style={styles.heroLabel}>Charge globale</Text>
          </View>

          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Puissance totale</Text>
              <Text style={styles.statVal}>{Math.round(totalPower)}<Text style={styles.statUnit}> W</Text></Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Énergie cumulée</Text>
              <Text style={styles.statVal}>{totalEnergy.toFixed(1)}<Text style={styles.statUnit}> Wh</Text></Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Turbines</Text>
              <Text style={styles.statVal}>{turbines.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Batteries</Text>
              <Text style={styles.statVal}>{totalBatteries}</Text>
            </View>
          </View>

          <Text style={styles.section}>Vos turbines</Text>
          {turbines.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>Aucune turbine connectée</Text>
              <Text style={styles.emptySub}>Ajoutez une turbine via le bouton + sur l'écran principal</Text>
            </View>
          ) : (
            turbines.map((t, i) => {
              const cap = (t.batteries || []).reduce((s: number, b: any) => s + b.capacity, 0);
              const chg = (t.batteries || []).reduce((s: number, b: any) => s + (b.capacity * b.percentage) / 100, 0);
              const pct = cap > 0 ? (chg / cap) * 100 : 0;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.turbineCard}
                  onPress={() => { onSelectTurbine(i); onClose(); }}
                >
                  <View style={styles.turbineRingWrap}>
                    <BatteryRing percentage={pct} size={60} strokeWidth={6} />
                  </View>
                  <View style={styles.turbineInfo}>
                    <View style={styles.turbineHead}>
                      <View style={[styles.statusDot, { backgroundColor: t.status === "En marche" ? theme.success : theme.warning }]} />
                      <Text style={styles.turbineName}>{t.name}</Text>
                    </View>
                    <Text style={styles.turbineSub}>
                      {Math.round(t.power || 0)} W · {(t.energy || 0).toFixed(1)} Wh ·{" "}
                      {(t.batteries || []).length} batt.
                    </Text>
                    <Text style={styles.turbineTime}>Connectée à {t.connectedAt}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
              );
            })
          )}

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
  hero: { alignItems: "center", padding: 16, gap: 8 },
  heroRingWrap: { padding: 8 },
  heroLabel: { fontSize: 11, letterSpacing: 1.5, color: theme.textSecondary, textTransform: "uppercase" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12 },
  statLabel: { fontSize: 9, letterSpacing: 1.5, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: "500", color: theme.textPrimary },
  statUnit: { fontSize: 12, color: theme.textSecondary },
  section: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: "uppercase", marginTop: 24, marginBottom: 8 },
  emptyCard: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 32, alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 14, color: theme.textPrimary, fontWeight: "500" },
  emptySub: { fontSize: 11, color: theme.textSecondary, textAlign: "center" },
  turbineCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 8 },
  turbineRingWrap: {},
  turbineInfo: { flex: 1, gap: 4 },
  turbineHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  turbineName: { fontSize: 14, color: theme.textPrimary, fontWeight: "500" },
  turbineSub: { fontSize: 11, color: theme.textSecondary },
  turbineTime: { fontSize: 10, color: theme.textSecondary },
  arrow: { fontSize: 16, color: theme.accent },
});
