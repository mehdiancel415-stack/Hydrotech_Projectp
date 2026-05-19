import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, withRepeat, withSequence, Easing,
  FadeIn, FadeInDown, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Ellipse, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';

const { width: W, height: H } = Dimensions.get('window');

// ─── SVG Illustration — turbine + rivière ─────────────────────────────────────
function HydroIllustration() {
  return (
    <Svg width={W} height={280} viewBox={`0 0 ${W} 280`}>
      {/* Ciel gradient */}
      <Ellipse cx={W / 2} cy={-20} rx={W * 0.9} ry={180} fill="rgba(0,212,180,0.04)" />

      {/* Collines arrière-plan */}
      <Path d={`M0 200 Q${W * 0.25} 120 ${W * 0.5} 160 Q${W * 0.75} 200 ${W} 140 L${W} 280 L0 280 Z`}
        fill="rgba(0,212,180,0.06)" />
      <Path d={`M0 230 Q${W * 0.3} 170 ${W * 0.6} 200 Q${W * 0.8} 220 ${W} 180 L${W} 280 L0 280 Z`}
        fill="rgba(0,212,180,0.09)" />

      {/* Rivière */}
      <Path d={`M0 245 Q${W * 0.2} 235 ${W * 0.4} 242 Q${W * 0.6} 250 ${W * 0.8} 240 Q${W * 0.9} 236 ${W} 238 L${W} 270 L0 270 Z`}
        fill="rgba(0,212,180,0.15)" />
      <Path d={`M0 255 Q${W * 0.3} 248 ${W * 0.55} 253 Q${W * 0.75} 258 ${W} 250 L${W} 280 L0 280 Z`}
        fill="rgba(0,212,180,0.10)" />

      {/* Turbine — corps */}
      <Rect x={W / 2 - 12} y={130} width={24} height={100} rx={6} fill={colors.bgElevated}
        stroke={colors.borderTeal} strokeWidth={1.5} />
      {/* Turbine — roue */}
      <Circle cx={W / 2} cy={168} r={38} fill="rgba(0,212,180,0.08)"
        stroke={colors.teal} strokeWidth={1.5} />
      <Circle cx={W / 2} cy={168} r={28} fill={colors.bgSurface}
        stroke={colors.borderTeal} strokeWidth={1} />
      <Circle cx={W / 2} cy={168} r={6} fill={colors.teal} />
      {/* Pales */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = W / 2 + Math.cos(rad) * 6;
        const y1 = 168 + Math.sin(rad) * 6;
        const x2 = W / 2 + Math.cos(rad) * 26;
        const y2 = 168 + Math.sin(rad) * 26;
        return (
          <Path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2 + Math.cos(rad + 1.2) * 8} ${(y1 + y2) / 2 + Math.sin(rad + 1.2) * 8} ${x2} ${y2}`}
            stroke={colors.teal} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        );
      })}

      {/* Câbles électriques */}
      <Path d={`M${W / 2 + 12} 145 Q${W * 0.7} 130 ${W * 0.85} 110`}
        stroke={colors.borderTeal} strokeWidth={1.5} fill="none" strokeDasharray="4,3" />
      <Path d={`M${W / 2 - 12} 145 Q${W * 0.3} 130 ${W * 0.15} 115`}
        stroke={colors.borderTeal} strokeWidth={1.5} fill="none" strokeDasharray="4,3" />

      {/* Pylône gauche */}
      <Path d={`M${W * 0.12} 115 L${W * 0.12} 200`} stroke={colors.bgElevated} strokeWidth={4} />
      <Path d={`M${W * 0.08} 120 L${W * 0.16} 120`} stroke={colors.bgElevated} strokeWidth={3} />
      <Path d={`M${W * 0.1} 140 L${W * 0.14} 140`} stroke={colors.bgElevated} strokeWidth={2} />

      {/* Pylône droit */}
      <Path d={`M${W * 0.88} 110 L${W * 0.88} 200`} stroke={colors.bgElevated} strokeWidth={4} />
      <Path d={`M${W * 0.84} 115 L${W * 0.92} 115`} stroke={colors.bgElevated} strokeWidth={3} />
      <Path d={`M${W * 0.86} 135 L${W * 0.9} 135`} stroke={colors.bgElevated} strokeWidth={2} />

      {/* Halo glow */}
      <Circle cx={W / 2} cy={168} r={55} fill="rgba(0,212,180,0.04)" />
    </Svg>
  );
}

// ─── Particule flottante ───────────────────────────────────────────────────────
function FloatingDot({ x, delay, size = 4 }: { x: number; delay: number; size?: number }) {
  const ty = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(withSequence(
      withTiming(-30, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
    op.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.8, { duration: 1100 }),
      withTiming(0.2, { duration: 1100 }),
    ), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View style={[{
      position: 'absolute', left: x, top: 90,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.teal,
    }, style]} />
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const btnScale = useSharedValue(1);

  // Skip onboarding if already seen
  useEffect(() => {
    AsyncStorage.getItem('hydrotech_onboarding_done').then((v) => {
      if (v) router.replace('/(tabs)');
    }).catch(() => {});
  }, []);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  async function handleStart() {
    btnScale.value = withSpring(0.94, { damping: 15 }, () => {
      btnScale.value = withSpring(1);
    });
    await AsyncStorage.setItem('hydrotech_onboarding_done', '1');
    router.replace('/(tabs)');
  }

  return (
    <View style={s.root}>
      {/* Orbes de fond */}
      <View style={s.orb1} />
      <View style={s.orb2} />

      {/* Particules */}
      <FloatingDot x={W * 0.1} delay={0} size={3} />
      <FloatingDot x={W * 0.25} delay={400} size={5} />
      <FloatingDot x={W * 0.75} delay={800} size={3} />
      <FloatingDot x={W * 0.88} delay={200} size={4} />

      {/* Logo */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={s.logoRow}>
        <View style={s.logoDot} />
        <Text style={s.logoText}>HYDROTECH</Text>
      </Animated.View>

      {/* Illustration */}
      <Animated.View entering={FadeIn.delay(200).duration(800)} style={s.illuWrap}>
        <HydroIllustration />
      </Animated.View>

      {/* Contenu textuel */}
      <View style={s.textWrap}>
        <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={s.title}>
          Bienvenue dans{'\n'}HydroTech
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(540).duration(600)} style={s.subtitle}>
          Surveillez vos turbines hydroélectriques, gérez les batteries et analysez votre production en temps réel.
        </Animated.Text>

        {/* Badges features */}
        <Animated.View entering={FadeInUp.delay(680).duration(600)} style={s.featRow}>
          {[
            { icon: '⚡', label: 'Temps réel' },
            { icon: '🔋', label: 'Batteries' },
            { icon: '🗺', label: 'Carte' },
          ].map((f) => (
            <View key={f.label} style={s.feat}>
              <Text style={s.featIcon}>{f.icon}</Text>
              <Text style={s.featLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* CTA Button */}
      <Animated.View entering={FadeInUp.delay(820).duration(600)} style={s.ctaWrap}>
        <Animated.View style={btnStyle}>
          <TouchableOpacity style={s.ctaBtn} onPress={handleStart} activeOpacity={0.9}>
            <Text style={s.ctaTxt}>Commencer →</Text>
          </TouchableOpacity>
        </Animated.View>
        <Text style={s.ctaNote}>Connectez votre ESP32 via Bluetooth</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: colors.bgBase,
    alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 48,
  },
  orb1: {
    position: 'absolute', top: -80, left: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(0,212,180,0.07)',
  },
  orb2: {
    position: 'absolute', bottom: 60, right: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal,
    shadowColor: colors.teal, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4,
  },
  logoText: {
    fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 3.5,
    color: colors.textPrimary, textTransform: 'uppercase',
  },

  illuWrap: { width: W, alignItems: 'center', marginVertical: -20 },

  textWrap: { paddingHorizontal: 32, alignItems: 'center', gap: 14 },
  title: {
    fontFamily: fontFamily.bold, fontSize: 34, color: colors.textPrimary,
    textAlign: 'center', letterSpacing: -0.8, lineHeight: 42,
  },
  subtitle: {
    fontFamily: fontFamily.regular, fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  featRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  feat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  featIcon: { fontSize: 14 },
  featLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary },

  ctaWrap: { width: '100%', paddingHorizontal: 32, alignItems: 'center', gap: 12 },
  ctaBtn: {
    width: '100%', backgroundColor: colors.teal,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.teal, shadowOpacity: 0.45, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 16,
  },
  ctaTxt: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.bgBase, letterSpacing: 0.2 },
  ctaNote: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted },
});
