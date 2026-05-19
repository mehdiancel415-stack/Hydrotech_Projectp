import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme, fontFamily } from '../constants/theme';

type Props = {
  percentage: number;
  size: number;
  strokeWidth: number;
  showLabel?: boolean;
};

export default function BatteryRing({ percentage, size, strokeWidth, showLabel = true }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const anim = useRef(new Animated.Value(percentage)).current;
  const [displayPct, setDisplayPct] = useState(percentage);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayPct(value));
    Animated.spring(anim, {
      toValue: Math.min(100, Math.max(0, percentage)),
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
    return () => anim.removeListener(id);
  }, [percentage]);

  const offset = circumference * (1 - displayPct / 100);
  const color =
    displayPct >= 80 ? theme.success :
    displayPct >= 40 ? theme.accent :
    displayPct >= 20 ? theme.warning :
    theme.danger;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={theme.border} strokeWidth={strokeWidth} fill="none"
        />
        {/* Glow halo */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth + 6} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
          opacity={0.13}
        />
        {/* Arc */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showLabel && (
        <Text style={[styles.pct, { fontSize: size * 0.21, color }]}>
          {Math.round(displayPct)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pct: { fontFamily: fontFamily.monoBold, letterSpacing: -0.5 },
});
