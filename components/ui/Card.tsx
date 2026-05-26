import { useCallback } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { colors } from '../../theme/colors';
import { radius, shadow } from '../../theme/spacing';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  pressable?: boolean;
  glow?: 'teal' | 'blue' | 'none';
};

export default function Card({ children, style, onPress, pressable = !!onPress, glow = 'none' }: Props) {
  const scale = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); })
    .onEnd(() => { if (onPress) runOnJS(onPress)(); })
    .onFinalize(() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = glow === 'teal' ? shadow.teal : glow === 'blue' ? shadow.blue : shadow.card;

  const content = (
    <Animated.View style={[styles.card, glowStyle, animStyle, style]}>
      {children}
    </Animated.View>
  );

  if (!pressable) return <Animated.View style={[styles.card, glowStyle, style]}>{children}</Animated.View>;

  return <GestureDetector gesture={tap}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
