import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type Props = { style?: StyleProp<ViewStyle>; lines?: number };

function SkeletonLine({ width, height = 12 }: { width: string | number; height?: number }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1, false,
    );
    return () => cancelAnimation(opacity);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.line,
        { width: width as any, height, borderRadius: height / 2 },
        style,
      ]}
    />
  );
}

export default function SkeletonCard({ style, lines = 3 }: Props) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLine width="45%" height={10} />
      <SkeletonLine width="70%" height={32} />
      {lines >= 3 && (
        <View style={styles.row}>
          <SkeletonLine width="30%" />
          <SkeletonLine width="30%" />
          <SkeletonLine width="25%" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  line: {
    backgroundColor: colors.bgElevated,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
