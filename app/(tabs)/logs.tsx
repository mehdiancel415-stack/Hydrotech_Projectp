import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useTurbines, Session } from '../../contexts/TurbinesContext';
import SessionChart from '../../components/SessionChart';
import { Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;

type FilterMode = 'all' | 'active' | 'ended';

const FILTERS: { key: FilterMode; label: string; icon: string }[] = [
  { key: 'all',    label: 'Toutes',    icon: '📋' },
  { key: 'active', label: 'En cours',  icon: '🟢' },
  { key: 'ended',  label: 'Terminées', icon: '✅' },
];

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'À l\'instant';
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function SessionCard({ session, index, expanded, onToggle, onDelete }: {
  session: Session;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isActive = session.endedAt === null;
  const duration = (session.endedAt || Date.now()) - session.startedAt;
  const min = Math.round(duration / 60000);
  const durStr = min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(320)}
      layout={Layout.springify()}
      style={s.card}
    >
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        {/* Colored top bar */}
        <View style={[s.cardBar, { backgroundColor: isActive ? colors.blue : colors.borderMedium }]} />

        <View style={s.cardBody}>
          {/* Top row */}
          <View style={s.cardTop}>
            <View style={s.cardLeft}>
              <Text style={s.cardName}>{session.turbineName}</Text>
              <Text style={s.cardMeta}>{formatDate(session.startedAt)}</Text>
              <Text style={s.cardDur}>{relativeTime(session.startedAt)} · {durStr}</Text>
            </View>
            <View style={s.cardRight}>
              {isActive ? (
                <View style={s.activePill}>
                  <View style={s.activeDot} />
                  <Text style={s.activeTxt}>EN COURS</Text>
                </View>
              ) : (
                <View style={s.endedPill}>
                  <Text style={s.endedTxt}>Terminée</Text>
                </View>
              )}
              {/* Delete button — uniquement sur sessions terminées */}
              {!isActive && (
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={s.deleteTxt}>🗑</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats chips */}
          <View style={s.chipsRow}>
            <View style={[s.chip, { borderColor: colors.data + '33' }]}>
              <Text style={[s.chipIcon]}>⚡</Text>
              <Text style={[s.chipVal, { color: colors.data }]}>{session.totalEnergy.toFixed(1)}</Text>
              <Text style={s.chipUnit}>Wh</Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipIcon}>📈</Text>
              <Text style={s.chipVal}>{Math.round(session.peakPower)}</Text>
              <Text style={s.chipUnit}>W pic</Text>
            </View>
            <View style={[s.chip, { borderColor: colors.success + '33' }]}>
              <Text style={s.chipIcon}>🌱</Text>
              <Text style={[s.chipVal, { color: colors.success }]}>{session.co2Saved.toFixed(3)}</Text>
              <Text style={s.chipUnit}>kg CO₂</Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipIcon}>📊</Text>
              <Text style={s.chipVal}>{session.powerSamples.length}</Text>
              <Text style={s.chipUnit}>pts</Text>
            </View>
          </View>

          <Text style={s.expandHint}>{expanded ? '▲ Réduire' : '▼ Courbe'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <Animated.View entering={FadeInDown.duration(280)} style={s.chartWrap}>
          <SessionChart samples={session.powerSamples} width={CHART_W} height={80} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function LogsScreen() {
  const { sessions, totalEnergyAllSessions, totalCo2Saved, deleteSession, clearEndedSessions } = useTurbines();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = sessions
    .filter((s) => filter === 'all' || (filter === 'active' ? s.endedAt === null : s.endedAt !== null))
    .slice().sort((a, b) => b.startedAt - a.startedAt);

  const endedCount = sessions.filter((s) => s.endedAt !== null).length;
  const totalDurMin = sessions.reduce((s, x) => s + ((x.endedAt || Date.now()) - x.startedAt) / 60000, 0);
  const peakAll = sessions.reduce((m, s) => Math.max(m, s.peakPower), 0);

  const handleDeleteSession = (session: Session) => {
    Alert.alert(
      'Supprimer la session ?',
      `"${session.turbineName}" — ${formatDate(session.startedAt)}\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (expandedId === session.id) setExpandedId(null);
            deleteSession(session.id);
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (endedCount === 0) return;
    Alert.alert(
      'Vider l\'historique ?',
      `${endedCount} session${endedCount > 1 ? 's' : ''} terminée${endedCount > 1 ? 's' : ''} seront supprimées.\n\nLes sessions en cours ne sont pas affectées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider les logs',
          style: 'destructive',
          onPress: () => {
            setExpandedId(null);
            clearEndedSessions();
          },
        },
      ],
    );
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <View>
            <Text style={s.headerSub}>Historique</Text>
            <Text style={s.headerTitle}>Sessions</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{sessions.length}</Text>
            </View>
            {endedCount > 0 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <TouchableOpacity style={s.clearBtn} onPress={handleClearAll} activeOpacity={0.75}>
                  <Text style={s.clearIcon}>🗑</Text>
                  <Text style={s.clearTxt}>Vider</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Global stats */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.globalRow}>
          <View style={[s.globalBox, { borderColor: colors.data + '33' }]}>
            <Text style={s.globalIcon}>⚡</Text>
            <Text style={[s.globalVal, { color: colors.data }]}>{totalEnergyAllSessions.toFixed(1)}</Text>
            <Text style={s.globalUnit}>Wh produits</Text>
          </View>
          <View style={[s.globalBox, { borderColor: colors.success + '33' }]}>
            <Text style={s.globalIcon}>🌱</Text>
            <Text style={[s.globalVal, { color: colors.success }]}>{totalCo2Saved.toFixed(2)}</Text>
            <Text style={s.globalUnit}>kg CO₂</Text>
          </View>
          <View style={s.globalBox}>
            <Text style={s.globalIcon}>📈</Text>
            <Text style={s.globalVal}>{Math.round(peakAll)}<Text style={{ fontSize: 11 }}> W</Text></Text>
            <Text style={s.globalUnit}>pic max</Text>
          </View>
          <View style={s.globalBox}>
            <Text style={s.globalIcon}>⏱</Text>
            <Text style={s.globalVal}>{Math.round(totalDurMin)}<Text style={{ fontSize: 11 }}> min</Text></Text>
            <Text style={s.globalUnit}>durée</Text>
          </View>
        </Animated.View>

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)} style={s.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={s.filterIcon}>{f.icon}</Text>
              <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.filterCount}>{filtered.length} session{filtered.length !== 1 ? 's' : ''}</Text>
        </Animated.View>

        {/* List */}
        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={s.emptyCard}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>Aucune session</Text>
            <Text style={s.emptyBody}>Connectez une turbine pour commencer à enregistrer vos sessions.</Text>
          </Animated.View>
        ) : (
          filtered.map((session, i) => (
            <SessionCard
              key={session.id}
              session={session}
              index={i}
              expanded={expandedId === session.id}
              onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
              onDelete={() => handleDeleteSession(session)}
            />
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingHorizontal: spacing.lg },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  headerSub: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  headerBadge: {
    backgroundColor: colors.blue10, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.borderBlue,
  },
  headerBadgeTxt: { fontFamily: fontFamily.monoBold, fontSize: 14, color: colors.blue },

  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.danger10, borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.danger + '40',
  },
  clearIcon: { fontSize: 13 },
  clearTxt: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.danger },

  globalRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  globalBox: {
    flex: 1, backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.md, padding: spacing.sm,
    alignItems: 'center', gap: 2,
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  globalIcon: { fontSize: 16 },
  globalVal: { fontFamily: fontFamily.monoBold, fontSize: 20, color: colors.textPrimary, letterSpacing: 0 },
  globalUnit: { fontFamily: fontFamily.medium, fontSize: 8, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { borderColor: colors.blue, backgroundColor: colors.blue10 },
  filterIcon: { fontSize: 11 },
  filterTxt: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary },
  filterTxtActive: { color: colors.blue, fontFamily: fontFamily.semibold },
  filterCount: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },

  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg, marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardBar: { height: 4 },
  cardBody: { padding: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  cardLeft: { flex: 1 },
  cardName: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textPrimary, letterSpacing: -0.2 },
  cardMeta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardDur: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 8 },

  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.success10, borderRadius: radius.full,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.success + '40',
  },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  activeTxt: { fontFamily: fontFamily.bold, fontSize: 8, color: colors.textInverse, letterSpacing: 1, backgroundColor: colors.success, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },

  endedPill: {
    backgroundColor: colors.bgInset, borderRadius: radius.full,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  endedTxt: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted },

  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.danger10,
    borderWidth: 1, borderColor: colors.danger + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteTxt: { fontSize: 13 },

  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  chip: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 1,
    backgroundColor: colors.bgInset, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: spacing.sm,
  },
  chipIcon: { fontSize: 12 },
  chipVal: { fontFamily: fontFamily.monoBold, fontSize: 13, color: colors.textPrimary, letterSpacing: 0 },
  chipUnit: { fontFamily: fontFamily.medium, fontSize: 8, color: colors.textMuted, textTransform: 'uppercase' },

  expandHint: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  chartWrap: { padding: spacing.lg, borderTopWidth: 1, borderColor: colors.border },

  emptyCard: {
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg, padding: spacing['3xl'],
    alignItems: 'center', gap: spacing.md,
    shadowColor: colors.blue, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: 17, color: colors.textPrimary },
  emptyBody: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
