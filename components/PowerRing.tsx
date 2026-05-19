import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme, fontFamily } from '../constants/theme';

type Props = { power: number; maxPower?: number };

const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PowerRing({ power, maxPower = 50 }: Props) {
  const animPct = useRef(new Animated.Value(Math.min(1, power / maxPower))).current;
  const animPower = useRef(new Animated.Value(power)).current;
  const [displayPct, setDisplayPct] = useState(Math.min(1, power / maxPower));
  const [displayPower, setDisplayPower] = useState(Math.round(power));

  useEffect(() => {
    const newPct = Math.min(1, Math.max(0, power / maxPower));
    const id1 = animPct.addListener(({ value }) => setDisplayPct(value));
    const id2 = animPower.addListener(({ value }) => setDisplayPower(Math.round(value)));
    Animated.parallel([
      Animated.spring(animPct, { toValue: newPct, useNativeDriver: false, tension: 55, friction: 11 }),
      Animated.timing(animPower, { toValue: power, duration: 900, useNativeDriver: false }),
    ]).start();
    return () => {
      animPct.removeListener(id1);
      animPower.removeListener(id2);
    };
  }, [power, maxPower]);

  const offset = CIRCUMFERENCE * (1 - displayPct);
  const color = displayPct > 0.7 ? theme.accent : displayPct > 0.35 ? theme.primary : theme.textSecondary;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={theme.border} strokeWidth={STROKE} fill="none"
        />
        {/* Glow halo */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={color} strokeWidth={STROKE + 10} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}
          opacity={0.1}
        />
        {/* Progress arc */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={color} strokeWidth={STROKE} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{displayPower}</Text>
        <Text style={styles.unit}>watts</Text>
        <Text style={styles.sub}>{Math.round(displayPct * 100)}% capacité</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: 2 },
  value: {
    fontFamily: fontFamily.monoBold,
    fontSize: 46, color: theme.textPrimary, letterSpacing: -2,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontSize: 11, color: theme.textSecondary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: 10, color: theme.textMuted, marginTop: 2,
  },
});
