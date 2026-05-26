// HydroTech Design System — Typography Tokens

export const fontFamily = {
  light:       'Outfit_300Light',
  regular:     'Outfit_400Regular',
  medium:      'Outfit_400Regular',
  semibold:    'Outfit_600SemiBold',
  bold:        'Outfit_600SemiBold',
  display:     'BebasNeue_400Regular',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium:  'JetBrainsMono_500Medium',
  monoBold:    'BebasNeue_400Regular',  // Big numbers → Bebas Neue
} as const;

export const textStyles = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 1,
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
    fontFamily: fontFamily.monoMedium,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  monoLarge: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    letterSpacing: 2,
    lineHeight: 60,
  },
} as const;
