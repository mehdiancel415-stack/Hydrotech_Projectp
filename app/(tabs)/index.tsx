import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withRepeat, withSequence,
  FadeInDown, FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Polyline, Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useTurbines, Battery } from '../../contexts/TurbinesContext';
import SkeletonCard from '../../components/ui/SkeletonCard';
import BatteryRow from '../../components/BatteryRow';
import TurbineSelector from '../../components/TurbineSelector';
import BluetoothScanner from '../../components/BluetoothScanner';
import BatteryConfig from '../../components/BatteryConfig';
import BatteryEditModal from '../../components/BatteryEditModal';
import { TurbineData } from '../../bleConfig';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, width, height }: { data: number[]; width: number; height: number }) {
  const d = data.slice(-24);
  if (d.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...d, 1);
  const pts = d.map((v, i) => ({
    x: (i / (d.length - 1)) * width,
    y: height - (v / max) * height * 0.82 - 2,
  }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = [`M${pts[0].x} ${height}`, ...pts.map((p) => `L${p.x} ${p.y}`), `L${pts[pts.length-1].x} ${height}Z`].join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={colors.teal} opacity={0.10} />
      <Polyline points={line} fill="none" stroke={colors.teal} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Power Arc ────────────────────────────────────────────────────────────────
const ARC_SIZE = 160;
const ARC_STROKE = 12;
const ARC_R = (ARC_SIZE - ARC_STROKE) / 2;
const ARC_C = 2 * Math.PI * ARC_R;

function PowerArc({ pct }: { pct: number }) {
  const clamp = Math.min(100, Math.max(0, pct));
  const color = clamp >= 80 ? colors.success : clamp >= 40 ? colors.teal : clamp >= 20 ? colors.warning : colors.danger;
  const offset = ARC_C * (1 - clamp / 100);
  const cx = ARC_SIZE / 2;
  const cy = ARC_SIZE / 2;
  return (
    <View style={{ width: ARC_SIZE, height: ARC_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={ARC_SIZE} height={ARC_SIZE} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={ARC_R} stroke={colors.border} strokeWidth={ARC_STROKE} fill="none" />
        {/* Glow */}
        <Circle cx={cx} cy={cy} r={ARC_R} stroke={color} strokeWidth={ARC_STROKE + 10} fill="none"
          strokeDasharray={ARC_C} strokeDashoffset={offset} strokeLinecap="round"
          rotation="-90" origin={`${cx},${cy}`} opacity={0.14} />
        {/* Arc */}
        <Circle cx={cx} cy={cy} r={ARC_R} stroke={color} strokeWidth={ARC_STROKE} fill="none"
          strokeDasharray={ARC_C} strokeDashoffset={offset} strokeLinecap="round"
          rotation="-90" origin={`${cx},${cy}`} />
      </Svg>
      <View style={{ alignItems: 'center', gap: 1 }}>
        <Text style={[s.arcNum, { color }]}>{Math.round(clamp)}<Text style={s.arcPct}>%</Text></Text>
        <Text style={s.arcLbl}>charge</Text>
      </View>
    </View>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, unit, color = colors.teal }:
  { icon: string; label: string; value: string | number; unit: string; color?: string }) {
  return (
    <View style={[s.metCard, { borderColor: color + '22' }]}>
      <View style={[s.metIcon, { backgroundColor: color + '15' }]}>
        <Text style={s.metIconTxt}>{icon}</Text>
      </View>
      <Text style={s.metLabel}>{label}</Text>
      <Text style={[s.metVal, { color }]}>{typeof value === 'number' ? value.toFixed(1) : value}</Text>
      <Text style={s.metUnit}>{unit}</Text>
    </View>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, unit, color = colors.textPrimary }:
  { label: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statVal, { color }]}>{value}{unit && <Text style={s.statUnit}> {unit}</Text>}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function LiveScreen() {
  const {
    turbines, activeTurbineId, setActiveTurbineId,
    addTurbine, removeTurbine, updateBatteries, setBatteryPct,
    currentSession, totalCo2Saved,
  } = useTurbines();
  const insets = useSafeAreaInsets();
  const [showScanner, setShowScanner] = useState(false);
  const [showAddBattery, setShowAddBattery] = useState(false);
  const [editBattery, setEditBattery] = useState<Battery | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('hydrotech_onboarding_done').then((v) => {
      if (cancelled) return;
      if (!v) router.replace('/onboarding');
      else setTimeout(() => { if (!cancelled) setBooting(false); }, 800);
    }).catch(() => { if (!cancelled) setBooting(false); });
    return () => { cancelled = true; };
  }, []);

  const active = turbines.find((t) => t.id === activeTurbineId) || turbines[0] || null;

  function handleConnect(device: { id: string; name: string }, bleData?: TurbineData) {
    const id = device.id.startsWith('demo-') ? device.id : Date.now();
    addTurbine({
      id, name: device.name, status: 'En marche',
      power: bleData?.power ?? 0,
      voltage: bleData?.voltage, current: bleData?.current, flowRate: 0.4,
      connectedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      location: null, batteries: [],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleAddBattery(d: { name: string; type: string; capacity: number }) {
    if (!active) return;
    const ranges: Record<string, [number, number]> = {
      LiFePO4: [10, 13.6], 'Li-ion': [10, 16.8], Plomb: [11.8, 12.7],
    };
    const [min, max] = ranges[d.type] ?? [10, 13.6];
    const volt = active.voltage ?? 13.2;
    const pct = Math.min(100, Math.max(0, Math.round(((volt - min) / (max - min)) * 100)));
    updateBatteries(active.id, [
      ...active.batteries,
      { id: Date.now(), name: d.name, type: d.type, capacity: d.capacity, percentage: pct },
    ]);
  }

  function batteryEta(b: Battery): string {
    if (b.percentage >= 100) return 'pleine';
    if (!active || active.power <= 0) return '—';
    const remainAh = b.capacity * (1 - b.percentage / 100);
    const totalCap = active.batteries.reduce((s, x) => s + x.capacity, 0);
    const amps = (active.power / 12) * (b.capacity / Math.max(1, totalCap));
    if (amps <= 0) return '—';
    const h = remainAh / amps;
    if (h > 24) return '>24h';
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return hh > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${mm}min`;
  }

  const totalCap = active?.batteries.reduce((s, b) => s + b.capacity, 0) ?? 0;
  const totalChg = active?.batteries.reduce((s, b) => s + b.capacity * b.percentage / 100, 0) ?? 0;
  const avgBattPct = totalCap > 0 ? (totalChg / totalCap) * 100 : 0;

  const sessionMin = currentSession ? Math.round((Date.now() - currentSession.startedAt) / 60000) : 0;
  const sessionStr = sessionMin < 60
    ? `${sessionMin}min`
    : `${Math.floor(sessionMin / 60)}h${String(sessionMin % 60).padStart(2, '0')}`;

  const statusColor = active ? colors.success : colors.textMuted;
  const statusLabel = active ? 'En ligne' : 'Hors ligne';

  // ─── EMPTY STATE ──────────────────────────────────────────────────────────
  if (!booting && turbines.length === 0) {
    return (
      <View style={s.root}>
        <Animated.View entering={FadeIn.duration(500)} style={s.emptyWrap}>
          {/* Orbe */}
          <View style={s.emptyOrb}>
            <Svg width={52} height={52} viewBox="0 0 24 24">
              <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={colors.blue} />
            </Svg>
          </View>
          <Text style={s.emptyTitle}>Aucune turbine</Text>
          <Text style={s.emptyBody}>
            Connectez votre turbine HydroTech via Bluetooth pour surveiller la production en temps réel.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setShowScanner(true)} activeOpacity={0.85}>
            <Text style={s.emptyBtnTxt}>📡  Connecter via Bluetooth</Text>
          </TouchableOpacity>
        </Animated.View>
        <BluetoothScanner visible={showScanner} onClose={() => setShowScanner(false)}
          onConnect={(d, data) => handleConnect(d, data as TurbineData)} />
      </View>
    );
  }

  // ─── SKELETON ─────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <View style={s.root}>
        <SkeletonCard style={{ margin: spacing.lg, marginTop: 64 }} />
        <SkeletonCard style={{ marginHorizontal: spacing.lg }} lines={2} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>

        {/* ─── HEADER ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={s.header}>
          <View>
            <Text style={s.headerGreeting}>Bonjour 👋</Text>
            <Text style={s.headerTitle}>HydroTech Live</Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.statusPill, {
              borderColor: active ? colors.success + '60' : colors.borderMedium,
              backgroundColor: active ? colors.success10 : colors.bgInset,
            }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── TURBINE SELECTOR ──────────────────────────────────────────── */}
        <TurbineSelector turbines={turbines} activeId={activeTurbineId}
          onSelect={setActiveTurbineId} onAdd={() => setShowScanner(true)} />

        {/* ─── HERO CARD ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.heroCard}>
          {/* Barre de puissance dynamique */}
          <View style={s.heroBandTrack}>
            <View style={[s.heroBandFill, { width: `${Math.min(100, (active?.power ?? 0))}%` as any }]} />
          </View>

          <View style={s.heroBody}>
            <View style={s.heroLeft}>
              <Text style={s.heroLabel}>Puissance</Text>
              <View style={s.heroPowerRow}>
                <Text style={s.heroPower}>{Math.round(active?.power ?? 0)}</Text>
                <Text style={s.heroWatts}>W</Text>
              </View>
              <View style={s.heroTagRow}>
                <View style={s.heroTag}>
                  <Text style={s.heroTagTxt}>⚡ {active?.connectedAt ?? '--:--'}</Text>
                </View>
              </View>
              {/* Sparkline */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={s.sparkLabel}>Historique</Text>
                <Sparkline data={active?.powerHistory ?? [active?.power ?? 0]} width={CHART_W * 0.52} height={40} />
              </View>
            </View>
            <PowerArc pct={avgBattPct} />
          </View>
        </Animated.View>

        {/* ─── METRICS ROW ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={s.metricsRow}>
          <MetricCard icon="⚡" label="Tension" value={active?.voltage ?? 0} unit="V" color={colors.blue} />
          <MetricCard icon="〰" label="Courant" value={active?.current ?? 0} unit="A" color={colors.teal} />
          <MetricCard icon="💧" label="Débit" value={active?.flowRate ?? 0} unit="m/s" color={colors.success} />
        </Animated.View>

        {/* ─── SESSION STATS ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={s.statsCard}>
          <Text style={s.sectionTitle}>Session en cours</Text>
          <View style={s.statsRow}>
            <StatBox
              label="Énergie produite"
              value={currentSession?.totalEnergy.toFixed(1) ?? '0.0'}
              unit="Wh"
              color={colors.data}
            />
            <View style={s.statsDivider} />
            <StatBox label="Durée" value={sessionStr} color={colors.textPrimary} />
            <View style={s.statsDivider} />
            <StatBox
              label="CO₂ évité"
              value={totalCo2Saved.toFixed(2)}
              unit="kg"
              color={colors.success}
            />
          </View>
        </Animated.View>

        {/* ─── BATTERIES ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={s.battCard}>
          <View style={s.battHead}>
            <View>
              <Text style={s.sectionTitle}>Batteries</Text>
              <Text style={s.sectionSub}>{active?.batteries.length ?? 0} connectée{(active?.batteries.length ?? 0) !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity style={s.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddBattery(true); }}
              activeOpacity={0.75}>
              <Text style={s.addBtnTxt}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {(active?.batteries.length ?? 0) === 0 ? (
            <View style={s.battEmpty}>
              <Text style={s.battEmptyIcon}>🔋</Text>
              <Text style={s.battEmptyTxt}>Ajoutez une batterie pour voir son état de charge</Text>
            </View>
          ) : (
            active!.batteries.map((b, i) => (
              <View key={b.id}>
                <BatteryRow name={b.name} type={b.type} capacity={b.capacity}
                  percentage={b.percentage} remainingTime={batteryEta(b)}
                  onPress={() => setEditBattery(b)} />
              </View>
            ))
          )}
        </Animated.View>

        {/* ─── DISCONNECT ────────────────────────────────────────────────── */}
        {active && (
          <TouchableOpacity
            style={s.disconnectBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); removeTurbine(active.id); }}
            activeOpacity={0.6}
          >
            <Text style={s.disconnectTxt}>Déconnecter {active.name}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <BluetoothScanner visible={showScanner} onClose={() => setShowScanner(false)}
        onConnect={(d, data) => handleConnect(d, data as TurbineData)} />
      <BatteryConfig visible={showAddBattery} onClose={() => setShowAddBattery(false)}
        onSave={handleAddBattery} detectedVoltage={active?.voltage} />
      <BatteryEditModal visible={editBattery !== null} battery={editBattery}
        onClose={() => setEditBattery(null)}
        onSave={(pct) => { if (active && editBattery) setBatteryPct(active.id, editBattery.id, pct); }}
        onDelete={() => { if (active && editBattery) updateBatteries(active.id, active.batteries.filter((b) => b.id !== editBattery.id)); }} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingHorizontal: spacing.lg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  headerGreeting: {
    fontFamily: fontFamily.regular, fontSize: 13,
    color: colors.textMuted, marginBottom: 2,
  },
  headerTitle: {
    fontFamily: fontFamily.display, fontSize: 32,
    color: colors.textPrimary, letterSpacing: 0.5,
  },
  headerRight: { paddingTop: 4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontFamily: fontFamily.semibold, fontSize: 11, letterSpacing: 0.3 },

  // Hero
  heroCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: colors.blue,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroBandTrack: {
    height: 6,
    backgroundColor: colors.bgInset,
    overflow: 'hidden',
  },
  heroBandFill: {
    height: '100%',
    backgroundColor: colors.blue,
    borderRadius: 0,
  },
  heroBody: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl, paddingTop: spacing.lg,
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    fontFamily: fontFamily.semibold, fontSize: 10, letterSpacing: 1.8,
    color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4,
  },
  heroPowerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroPower: {
    fontFamily: fontFamily.monoBold, fontSize: 72,
    color: colors.data, letterSpacing: 2, lineHeight: 76,
  },
  heroWatts: {
    fontFamily: fontFamily.semibold, fontSize: 24,
    color: colors.textSecondary, marginBottom: 12,
  },
  heroTagRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  heroTag: {
    backgroundColor: colors.bgInset, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  heroTagTxt: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted },
  sparkLabel: {
    fontFamily: fontFamily.semibold, fontSize: 9, letterSpacing: 1.2,
    color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4,
  },

  // Arc
  arcNum: { fontFamily: fontFamily.monoBold, fontSize: 30, letterSpacing: 0 },
  arcPct: { fontSize: 16, letterSpacing: 0 },
  arcLbl: {
    fontFamily: fontFamily.medium, fontSize: 10, letterSpacing: 0.8,
    color: colors.textMuted, textTransform: 'uppercase',
  },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metCard: {
    flex: 1, backgroundColor: colors.bgSurface,
    borderWidth: 1, borderRadius: radius.lg,
    borderTopColor: 'rgba(255,255,255,0.9)',
    padding: spacing.md, alignItems: 'center', gap: 4,
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  metIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  metIconTxt: { fontSize: 16 },
  metLabel: {
    fontFamily: fontFamily.semibold, fontSize: 9, letterSpacing: 1.2,
    color: colors.textMuted, textTransform: 'uppercase',
  },
  metVal: { fontFamily: fontFamily.monoBold, fontSize: 22, letterSpacing: 0.5 },
  metUnit: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted },

  // Stats
  statsCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  sectionTitle: {
    fontFamily: fontFamily.display, fontSize: 18, letterSpacing: 0.5,
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  sectionSub: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontFamily: fontFamily.monoBold, fontSize: 26, color: colors.textPrimary, letterSpacing: 1 },
  statUnit: { fontSize: 12, color: colors.textSecondary },
  statLabel: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  statsDivider: { width: 1, height: 40, backgroundColor: colors.border },

  // Batteries
  battCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  battHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  addBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7,
    shadowColor: colors.blue, shadowOpacity: 0.32, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  addBtnTxt: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.textInverse },
  battEmpty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  battEmptyIcon: { fontSize: 28 },
  battEmptyTxt: { fontFamily: fontFamily.light, fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // Disconnect
  disconnectBtn: { paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  disconnectTxt: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.danger, letterSpacing: 0.2 },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing['4xl'], gap: spacing.lg, paddingTop: 80,
  },
  emptyOrb: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.blue10,
    borderWidth: 1, borderColor: colors.borderBlue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.blue, shadowOpacity: 0.3, shadowRadius: 28, elevation: 10,
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontFamily: fontFamily.display, fontSize: 32, color: colors.textPrimary, letterSpacing: 0.5 },
  emptyBody: {
    fontFamily: fontFamily.light, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: colors.blue, borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, marginTop: spacing.sm,
    shadowColor: colors.blue, shadowOpacity: 0.45, shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  emptyBtnTxt: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textInverse },
});
