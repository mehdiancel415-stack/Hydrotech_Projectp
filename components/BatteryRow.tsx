import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, fontFamily } from '../constants/theme';

type Props = {
  name: string;
  type: string;
  capacity: number;
  percentage: number;
  remainingTime: string;
  onPress?: () => void;
};

export default function BatteryRow({ name, type, capacity, percentage, remainingTime, onPress }: Props) {
  const color =
    percentage >= 90 ? theme.success :
    percentage >= 50 ? theme.accent :
    percentage >= 20 ? theme.warning :
    theme.danger;

  const isFull = percentage >= 100;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.pct, { color }]}>{Math.round(percentage)}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, percentage)}%` as any, backgroundColor: color },
            ]}
          />
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaTxt}>{type} · {capacity} Ah</Text>
          <Text style={[styles.eta, isFull && { color: theme.success }]}>
            {isFull ? '✓ Pleine' : `⏱ ${remainingTime}`}
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderColor: theme.borderSoft,
  },
  body: { flex: 1, gap: 7 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: fontFamily.semibold, fontSize: 13, color: theme.textPrimary },
  pct: { fontFamily: fontFamily.monoBold, fontSize: 17, letterSpacing: -0.5 },
  barTrack: { height: 4, backgroundColor: theme.bgElevated, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTxt: { fontFamily: fontFamily.regular, fontSize: 11, color: theme.textMuted },
  eta: { fontFamily: fontFamily.medium, fontSize: 11, color: theme.textSecondary },
  arrow: { fontFamily: fontFamily.regular, fontSize: 20, color: theme.textMuted, paddingLeft: 10 },
});
