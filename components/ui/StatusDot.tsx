import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

type Status = 'connected' | 'searching' | 'disconnected';

type Props = { status: Status; label?: string };

const STATUS_COLOR: Record<Status, string> = {
  connected:    colors.success,
  searching:    colors.warning,
  disconnected: colors.textMuted,
};

const STATUS_LABEL: Record<Status, string> = {
  connected:    'Connecté',
  searching:    'Recherche…',
  disconnected: 'Hors-ligne',
};

export default function StatusDot({ status, label }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (status === 'connected' || status === 'searching') {
      scale.value = withRepeat(
        withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1, false,
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0, { duration: 700 }), withTiming(0.5, { duration: 700 })),
        -1, false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1);
      opacity.value = withTiming(0);
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dotColor = STATUS_COLOR[status];
  const text = label ?? STATUS_LABEL[status];

  return (
    <View style={styles.pill}>
      <View style={styles.dotWrap}>
        {/* Pulse ring */}
        <Animated.View
          style={[
            styles.pulse,
            { backgroundColor: dotColor },
            pulseStyle,
          ]}
        />
        {/* Solid dot */}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={[styles.label, { color: dotColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
