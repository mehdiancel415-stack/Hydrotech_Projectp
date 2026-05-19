import { View, Text, StyleSheet } from 'react-native';
import { theme, fontFamily, radius } from '../constants/theme';

type Props = { value: string; unit?: string; label: string; accent?: boolean };

export default function StatCard({ value, unit, label, accent }: Props) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.border,
    borderRadius: radius.md,
    padding: 12, gap: 4,
  },
  cardAccent: {
    borderColor: theme.accent + '44',
    backgroundColor: theme.accent + '08',
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: {
    fontFamily: fontFamily.monoBold,
    fontSize: 20, color: theme.textPrimary, letterSpacing: -0.5,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontSize: 11, color: theme.textSecondary,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 9, letterSpacing: 1.5,
    color: theme.textMuted, textTransform: 'uppercase',
  },
});
