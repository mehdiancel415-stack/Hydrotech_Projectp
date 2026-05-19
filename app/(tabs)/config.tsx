import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useTurbines } from '../../contexts/TurbinesContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import CustomSwitch from '../../components/ui/CustomSwitch';
import BluetoothScanner from '../../components/BluetoothScanner';
import { TurbineData } from '../../bleConfig';

function SectionLabel({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={s.sectionLabel}>
      <View style={s.sectionIconWrap}><Text style={s.sectionIcon}>{icon}</Text></View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={s.settCard}>{children}</View>;
}

function SettingsRow({ icon, label, sub, right, onPress, last = false }: {
  icon: string; label: string; sub?: string;
  right?: React.ReactNode; onPress?: () => void; last?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <>
      <Wrapper style={s.row} onPress={onPress} activeOpacity={0.7}>
        <View style={s.rowIconWrap}><Text style={s.rowIconTxt}>{icon}</Text></View>
        <View style={s.rowBody}>
          <Text style={s.rowLabel}>{label}</Text>
          {sub && <Text style={s.rowSub}>{sub}</Text>}
        </View>
        {right && <View style={s.rowRight}>{right}</View>}
        {onPress && <Text style={s.rowArrow}>›</Text>}
      </Wrapper>
      {!last && <View style={s.sep} />}
    </>
  );
}

export default function ConfigScreen() {
  const insets = useSafeAreaInsets();
  const { turbines, activeTurbineId, addTurbine, updateBatteries, removeTurbine } = useTurbines();
  const { settings, update: updateSettings } = useAppSettings();
  const [showScanner, setShowScanner] = useState(false);

  const active = turbines.find((t) => t.id === activeTurbineId) || turbines[0] || null;

  function handleConnect(device: { id: string; name: string }, bleData?: TurbineData) {
    const id = device.id.startsWith('demo-') ? device.id : Date.now();
    addTurbine({
      id, name: device.name, status: 'En marche',
      power: bleData?.power ?? 15, voltage: bleData?.voltage, current: bleData?.current,
      flowRate: 0.4,
      connectedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      location: null, batteries: [],
    });
  }

  function moveBattery(idx: number, dir: -1 | 1) {
    if (!active) return;
    const arr = [...active.batteries];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    updateBatteries(active.id, arr);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
        <View>
          <Text style={s.headerSub}>Application</Text>
          <Text style={s.headerTitle}>Paramètres</Text>
        </View>
        <View style={s.headerVersion}>
          <Text style={s.headerVersionTxt}>v1.0.0</Text>
        </View>
      </Animated.View>

      {/* Bluetooth */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <SectionLabel icon="📡" title="Bluetooth" />
        <SettingsCard>
          <SettingsRow
            icon="🔍" label="Scanner un ESP32" sub="Détecter une nouvelle turbine"
            onPress={() => setShowScanner(true)}
          />
          <SettingsRow
            icon="🔄" label="Reconnexion auto" sub="Se reconnecter si signal perdu"
            right={<CustomSwitch value={settings.bleAutoReconnect} onValueChange={(v) => updateSettings({ bleAutoReconnect: v })} />}
            last
          />
        </SettingsCard>
      </Animated.View>

      {/* Mesure */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <SectionLabel icon="⏱" title="Intervalle de mesure" />
        <SettingsCard>
          <View style={s.chipSection}>
            <Text style={s.chipSectionLabel}>Rafraîchissement BLE ({settings.refreshRateSec}s)</Text>
            <View style={s.chipRow}>
              {[3, 5, 10, 30].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.chip, settings.refreshRateSec === r && s.chipActive]}
                  onPress={() => { updateSettings({ refreshRateSec: r }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[s.chipTxt, settings.refreshRateSec === r && s.chipTxtActive]}>{r}s</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SettingsCard>
      </Animated.View>

      {/* Turbines */}
      <Animated.View entering={FadeInDown.delay(140).duration(400)}>
        <SectionLabel icon="⚡" title={`Turbines connectées (${turbines.length})`} />
        {turbines.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>Aucune turbine connectée</Text>
          </View>
        ) : (
          <SettingsCard>
            {turbines.map((t, i) => (
              <View key={t.id}>
                <View style={s.row}>
                  <View style={[s.statusDot, {
                    backgroundColor: t.status === 'En marche' ? colors.success : colors.warning,
                  }]} />
                  <View style={s.rowBody}>
                    <Text style={s.rowLabel}>{t.name}</Text>
                    <Text style={s.rowSub}>{Math.round(t.power || 0)} W · {t.batteries.length} batt.</Text>
                  </View>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => removeTurbine(t.id)}
                  >
                    <Text style={s.deleteTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                {i < turbines.length - 1 && <View style={s.sep} />}
              </View>
            ))}
          </SettingsCard>
        )}
      </Animated.View>

      {/* Smart Charge */}
      <Animated.View entering={FadeInDown.delay(180).duration(400)}>
        <SectionLabel icon="🔋" title="Priorité de charge" />
        {!active || active.batteries.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>Connectez une turbine avec des batteries</Text>
          </View>
        ) : (
          <SettingsCard>
            {active.batteries.map((b, i) => (
              <View key={b.id}>
                <View style={s.priorityRow}>
                  <View style={s.priorityNum}>
                    <Text style={s.priorityNumTxt}>{i + 1}</Text>
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowLabel}>{b.name}</Text>
                    <Text style={s.rowSub}>{b.type} · {b.capacity} Ah · {Math.round(b.percentage)}%</Text>
                  </View>
                  <View style={s.arrowBtns}>
                    <TouchableOpacity
                      style={[s.arrowBtn, i === 0 && s.arrowBtnOff]}
                      onPress={() => moveBattery(i, -1)} disabled={i === 0}
                    >
                      <Text style={[s.arrowTxt, i === 0 && { color: colors.textMuted }]}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.arrowBtn, i === active.batteries.length - 1 && s.arrowBtnOff]}
                      onPress={() => moveBattery(i, 1)} disabled={i === active.batteries.length - 1}
                    >
                      <Text style={[s.arrowTxt, i === active.batteries.length - 1 && { color: colors.textMuted }]}>↓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {i < active.batteries.length - 1 && <View style={s.sep} />}
              </View>
            ))}
          </SettingsCard>
        )}
      </Animated.View>

      {/* Alertes */}
      <Animated.View entering={FadeInDown.delay(220).duration(400)}>
        <SectionLabel icon="🔔" title="Alertes" />
        <SettingsCard>
          <View style={s.chipSection}>
            <Text style={s.chipSectionLabel}>Seuil "batterie pleine" ({settings.alertThresholdPct}%)</Text>
            <View style={s.chipRow}>
              {[80, 90, 95].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.chip, settings.alertThresholdPct === p && s.chipActive]}
                  onPress={() => updateSettings({ alertThresholdPct: p })}
                >
                  <Text style={[s.chipTxt, settings.alertThresholdPct === p && s.chipTxtActive]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SettingsCard>
      </Animated.View>

      {/* Carte */}
      <Animated.View entering={FadeInDown.delay(260).duration(400)}>
        <SectionLabel icon="🗺" title="Carte" />
        <SettingsCard>
          <SettingsRow
            icon="💾" label="Cache offline" sub="Utiliser la carte sans réseau"
            right={<CustomSwitch value={settings.offlineMapEnabled} onValueChange={(v) => updateSettings({ offlineMapEnabled: v })} />}
            last
          />
        </SettingsCard>
      </Animated.View>

      {/* À propos */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <SectionLabel icon="ℹ️" title="À propos" />
        <SettingsCard>
          {[
            { label: 'Version',     value: '1.0.0' },
            { label: 'Protocole',   value: 'BLE 5.0' },
            { label: 'Carte',       value: 'OpenFreeMap (OSM)' },
            { label: 'Itinéraires', value: 'OSRM' },
            { label: 'Météo',       value: 'Open-Meteo' },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoVal}>{item.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.sep} />}
            </View>
          ))}
        </SettingsCard>
      </Animated.View>

      <View style={{ height: 120 }} />

      <BluetoothScanner visible={showScanner} onClose={() => setShowScanner(false)}
        onConnect={(d, data) => handleConnect(d, data as TurbineData)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingHorizontal: spacing.lg },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.xl,
  },
  headerSub: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.7 },
  headerVersion: {
    backgroundColor: colors.bgElevated, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  headerVersionTxt: { fontFamily: fontFamily.monoMedium, fontSize: 11, color: colors.textMuted },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: radius.xs,
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIcon: { fontSize: 14 },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3 },

  settCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: 'hidden',
  },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  rowIconWrap: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconTxt: { fontSize: 16 },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.textPrimary },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  rowRight: {},
  rowArrow: { fontFamily: fontFamily.regular, fontSize: 22, color: colors.textMuted },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 36 + spacing.md },

  chipSection: { padding: spacing.lg, gap: spacing.md },
  chipSectionLabel: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.bgElevated, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { borderColor: colors.teal, backgroundColor: colors.teal10 },
  chipTxt: { fontFamily: fontFamily.monoMedium, fontSize: 13, color: colors.textSecondary },
  chipTxtActive: { color: colors.teal },

  statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 4 },
  deleteBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteTxt: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.danger },

  emptyBox: {
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center',
  },
  emptyTxt: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted },

  priorityRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  priorityNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.teal20, borderWidth: 1, borderColor: colors.borderTeal,
    alignItems: 'center', justifyContent: 'center',
  },
  priorityNumTxt: { fontFamily: fontFamily.monoBold, fontSize: 13, color: colors.teal },
  arrowBtns: { flexDirection: 'row', gap: 6 },
  arrowBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  arrowBtnOff: { opacity: 0.25 },
  arrowTxt: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.teal },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  infoLabel: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary },
  infoVal: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textSecondary },
});
