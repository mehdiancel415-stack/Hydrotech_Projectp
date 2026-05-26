import { Platform } from 'react-native';

// Re-export design system tokens so old imports keep working
export { colors } from '../theme/colors';
export { textStyles } from '../theme/typography';
export { spacing as spacingScale, radius as radiusScale, shadow } from '../theme/spacing';

// ─── Unified theme object (used by all components via `theme.X`) ───────────

export const theme = {
  // Backgrounds
  bg:          '#F0F4F8',
  bgCard:      '#FAFCFF',
  bgElevated:  '#FFFFFF',
  bgInset:     '#E8EDF5',
  bgChip:      '#EEF2F8',

  // Borders
  border:       '#CBD5E1',
  borderSoft:   '#E2E8F0',
  borderStrong: '#94A3B8',
  borderAccent: 'rgba(27,79,155,0.25)',

  // Primary accent — navy
  primary:    '#1B4F9B',
  primaryDim: 'rgba(27,79,155,0.10)',
  accent:     '#2563C4',
  accentSoft: 'rgba(37,99,196,0.10)',
  cyan:       '#0EA5E9',

  // Glows
  glowBlue:  'rgba(27,79,155,0.12)',
  glowGreen: 'rgba(22,163,74,0.12)',

  // Status
  success:      '#16A34A',
  successDim:   'rgba(22,163,74,0.10)',
  successBright:'#22C55E',
  warning:      '#D97706',
  warningDim:   'rgba(217,119,6,0.10)',
  danger:       '#DC2626',
  dangerDim:    'rgba(220,38,38,0.10)',

  // Text
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textInverse:   '#F0F4F8',
} as const;

// ─── Font families ──────────────────────────────────────────────────────────

export const fontFamily = {
  light:       'Outfit_300Light',
  regular:     'Outfit_400Regular',
  medium:      'Outfit_400Regular',
  semibold:    'Outfit_600SemiBold',
  bold:        'Outfit_600SemiBold',
  display:     'BebasNeue_400Regular',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium:  'JetBrainsMono_500Medium',
  monoBold:    'BebasNeue_400Regular',
} as const;

// ─── Spacing & radius ───────────────────────────────────────────────────────

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, '3xl': 32, '4xl': 48,
} as const;

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 20, xl: 28, full: 9999,
} as const;

// ─── Gradients ──────────────────────────────────────────────────────────────

export const gradients = {
  power:     ['#1B4F9B', '#2563C4'],
  battery:   ['#16A34A', '#2563C4'],
  warning:   ['#D97706', '#DC2626'],
  powerSoft: ['#EEF2F8', '#E0EAFB'],
} as const;

// ─── Expo template compat ───────────────────────────────────────────────────

export const Colors = {
  light:  { text: '#0F172A', background: '#F0F4F8', tint: '#1B4F9B', icon: '#64748B', tabIconDefault: '#94A3B8', tabIconSelected: '#1B4F9B' },
  dark:   { text: '#0F172A', background: '#F0F4F8', tint: '#1B4F9B', icon: '#64748B', tabIconDefault: '#94A3B8', tabIconSelected: '#1B4F9B' },
};

export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web:     { sans: 'system-ui, -apple-system, sans-serif', serif: 'Georgia, serif', rounded: "'SF Pro Rounded', system-ui, sans-serif", mono: 'SFMono-Regular, Menlo, monospace' },
});
