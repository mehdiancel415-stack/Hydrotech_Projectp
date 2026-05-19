import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

type Trend = 'up' | 'down' | 'stable';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: Trend;
  accent?: boolean;
};

const TREND_ICON: Record<Trend, string> = { up: '↑', down: '↓', stable: '→' };
const TREND_COLOR: Record<Trend, string> = {
  up: colors.success,
  down: colors.danger,
  stable: colors.textMuted,
};

export default function MetricBadge({ label, value, unit, trend, accent }: Props) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    opacity.value = withSequence(withTiming(0.2, { duration: 120 }), withTiming(1, { duration: 200 }));
    translateY.value = withSequence(withTiming(6, { duration: 80 }), withTiming(0, { duration: 200 }));
    return () => { cancelAnimation(opacity); cancelAnimation(translateY); };
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.badge, accent && styles.badgeAccent]}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.valueRow, animStyle]}>
        <Text style={[styles.value, accent && { color: colors.teal }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </Animated.View>
      {trend && (
        <Text style={[styles.trend, { color: TREND_COLOR[trend] }]}>
          {TREND_ICON[trend]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  badgeAccent: {
    borderColor: colors.borderTeal,
    backgroundColor: colors.teal10,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: {
    fontFamily: fontFamily.monoBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  trend: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
});
