import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

type Props = { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean };

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB = 22;
const OFFSET = (TRACK_H - THUMB) / 2;
const TRAVEL = TRACK_W - THUMB - OFFSET * 2;

export default function CustomSwitch({ value, onValueChange, disabled }: Props) {
  const tx = useSharedValue(value ? TRAVEL : 0);
  const trackOpacity = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    tx.value = withSpring(value ? TRAVEL : 0, { damping: 18, stiffness: 300 });
    trackOpacity.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 300 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(27,79,155,${trackOpacity.value * 0.9})`,
  }));

  const toggle = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <Pressable onPress={toggle} style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W, height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderMedium,
    justifyContent: 'center',
    paddingHorizontal: OFFSET,
  },
  thumb: {
    width: THUMB, height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
