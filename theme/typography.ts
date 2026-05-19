// HydroTech Design System — Typography Tokens

export const fontFamily = {
  regular:     'Inter_400Regular',
  medium:      'Inter_500Medium',
  semibold:    'Inter_600SemiBold',
  bold:        'Inter_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium:  'JetBrainsMono_500Medium',
  monoBold:    'JetBrainsMono_700Bold',
} as const;

export const textStyles = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: fontFamily.monoBold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  monoLarge: {
    fontFamily: fontFamily.monoBold,
    fontSize: 48,
    letterSpacing: -2,
    lineHeight: 52,
  },
} as const;
