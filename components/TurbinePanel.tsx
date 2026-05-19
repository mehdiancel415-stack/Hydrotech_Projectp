import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { theme } from '../constants/theme';
import BatteryRing from './BatteryRing';
import BatteryCarousel from './BatteryCarousel';
import BatteryConfig from './BatteryConfig';
import PowerChart from './PowerChart';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Battery = { id: number; name: string; type: string; capacity: number; percentage: number };

type Turbine = {
  id: number | string;
  name: string;
  status: string;
  power: number;
  energy: number;
  connectedAt: string;
  onDelete: (id: number | string) => void;
  onUpdateBatteries: (turbineId: number | string, batteries: Battery[]) => void;
  onEditBattery?: (turbineId: number | string, battery: Battery) => void;
  onEditTurbine?: (turbineId: number | string) => void;
  batteries: Battery[];
  powerHistory?: number[];
};

type Props = { turbine: Turbine };

const voltageToPercent = (voltage: number, type: string): number => {
  const ranges: Record<string, [number, number]> = {
    'LiFePO4': [10.0, 13.6],
    'Li-ion': [10.0, 16.8],
    'Plomb': [11.8, 12.7],
  };
  const [min, max] = ranges[type] ?? [10.0, 13.6];
  const pct = Math.round((voltage - min) / (max - min) * 100);
  return Math.min(100, Math.max(0, pct));
};

export default function TurbinePanel({ turbine }: Props) {
  const [showBatteryConfig, setShowBatteryConfig] = useState(false);

  const totalCap = turbine.batteries.reduce((s, b) => s + b.capacity, 0);
  const totalCharged = turbine.batteries.reduce((s, b) => s + b.capacity * b.percentage / 100, 0);
  const avgPct = totalCap > 0 ? totalCharged / totalCap * 100 : 0;
  const remAh = (totalCap - totalCharged).toFixed(1);
  const totalH = turbine.power > 0 ? (totalCap - totalCharged) / (turbine.power / 12) : 0;
  const etaH = Math.floor(totalH);
  const etaM = Math.round((totalH - etaH) * 60);

  const handleAddBattery = (data: { name: string; type: string; capacity: number }) => {
    const newBattery: Battery = {
      id: Date.now(),
      name: data.name,
      type: data.type,
      capacity: data.capacity,
      percentage: voltageToPercent(13.2, data.type),
    };
    turbine.onUpdateBatteries(turbine.id, [...turbine.batteries, newBattery]);
  };

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH }]}>
      <View style={styles.turbineHeader}>
        <View style={styles.turbineDot} />
        <View style={styles.turbineHeaderLeft}>
          <Text style={styles.turbineName}>{turbine.name}</Text>
          <Text style={styles.turbineTime}>connecté à {turbine.connectedAt}</Text>
        </View>
        {turbine.onEditTurbine && (
          <TouchableOpacity style={styles.editBtn} onPress={() => turbine.onEditTurbine?.(turbine.id)}>
            <Text style={styles.editTxt}>Modifier</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => turbine.onDelete(turbine.id)}>
          <Text style={styles.deleteTxt}>Déconnecter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} nestedScrollEnabled={true}>
        {turbine.batteries.length > 0 ? (
          <>
            <View style={styles.bigRingWrap}>
              <BatteryRing percentage={avgPct} size={90} strokeWidth={8} />
              <View style={styles.bigRingInfo}>
                <Text style={styles.etaMain}>~{etaH}h {etaM}min</Text>
                <Text style={styles.etaSub}>avant charge complète</Text>
                <Text style={styles.etaSub}>{totalCap} Ah · {remAh} Ah restants</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.mc}>
                <Text style={styles.mcLabel}>Puissance</Text>
                <Text style={styles.mcVal}>{Math.round(turbine.power)}<Text style={styles.mcUnit}> W</Text></Text>
              </View>
              <View style={styles.mc}>
                <Text style={styles.mcLabel}>Énergie</Text>
                <Text style={styles.mcVal}>{turbine.energy.toFixed(1)}<Text style={styles.mcUnit}> Wh</Text></Text>
              </View>
            </View>

            {/* GRAPHIQUE PUISSANCE TEMPS RÉEL */}
            <View style={styles.chartCard}>
              <PowerChart
                history={turbine.powerHistory || []}
                width={SCREEN_WIDTH - 32 - 28}
                height={70}
                label="Puissance — derniers points"
              />
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: turbine.status === 'En marche' ? theme.success : theme.warning }]} />
              <Text style={styles.statusTxt}>{turbine.status}</Text>
              <View style={styles.bleBadge}><Text style={styles.bleTxt}>BLE</Text></View>
            </View>

            <BatteryCarousel
              batteries={turbine.batteries}
              onEdit={(b) => turbine.onEditBattery?.(turbine.id, b)}
              onDelete={(batteryId) => {
                turbine.onUpdateBatteries(
                  turbine.id,
                  turbine.batteries.filter((b) => b.id !== batteryId),
                );
              }}
            />
          </>
        ) : (
          <View style={styles.noBatteryCard}>
            <Text style={styles.noBatteryIcon}>🔋</Text>
            <Text style={styles.noBatteryTitle}>Aucune batterie connectée</Text>
            <Text style={styles.noBatterySub}>Branchez une batterie au boîtier puis ajoutez-la</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addBatteryBtn} onPress={() => setShowBatteryConfig(true)}>
          <Text style={styles.addBatteryTxt}>+ Ajouter une batterie</Text>
        </TouchableOpacity>
      </ScrollView>

      <BatteryConfig
        visible={showBatteryConfig}
        onClose={() => setShowBatteryConfig(false)}
        onSave={handleAddBattery}
        detectedVoltage={13.2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  turbineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  turbineHeaderLeft: { flex: 1 },
  turbineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success },
  turbineName: { fontSize: 14, fontWeight: '500', color: theme.textPrimary },
  turbineTime: { fontSize: 10, color: theme.textSecondary, marginTop: 1 },
  editBtn: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editTxt: { color: theme.accent, fontSize: 11 },
  deleteBtn: { backgroundColor: '#1a0808', borderWidth: 0.5, borderColor: theme.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  deleteTxt: { color: theme.danger, fontSize: 11 },
  scroll: { flex: 1 },
  bigRingWrap: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  bigRingInfo: { flex: 1, gap: 4 },
  etaMain: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  etaSub: { fontSize: 10, color: theme.textSecondary },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mc: { flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12 },
  mcLabel: { fontSize: 9, letterSpacing: 1, color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  mcVal: { fontSize: 20, fontWeight: '500', color: theme.textPrimary },
  mcUnit: { fontSize: 11, color: theme.textSecondary },
  chartCard: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { flex: 1, fontSize: 13, color: theme.textPrimary },
  bleBadge: { backgroundColor: theme.bg, borderWidth: 0.5, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  bleTxt: { color: theme.textSecondary, fontSize: 10, letterSpacing: 1 },
  noBatteryCard: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginBottom: 10 },
  noBatteryIcon: { fontSize: 32 },
  noBatteryTitle: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
  noBatterySub: { fontSize: 11, color: theme.textSecondary, textAlign: 'center', lineHeight: 16 },
  addBatteryBtn: { backgroundColor: '#0f2040', borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBatteryTxt: { fontSize: 14, color: theme.accent, fontWeight: '500' },
});
