import { Platform } from 'react-native';

// Re-export design system tokens so old imports keep working
export { colors } from '../theme/colors';
export { fontFamily, textStyles } from '../theme/typography';
export { spacing as spacingScale, radius as radiusScale, shadow } from '../theme/spacing';

// ─── Unified theme object (used by all components via `theme.X`) ───────────

export const theme = {
  // Backgrounds
  bg:          '#090E1A',
  bgCard:      '#0F1629',
  bgElevated:  '#161E35',
  bgInset:     '#060A14',
  bgChip:      '#161E35',

  // Borders
  border:       'rgba(255,255,255,0.06)',
  borderSoft:   'rgba(255,255,255,0.04)',
  borderStrong: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(0,212,180,0.25)',

  // Primary accent — teal électrique
  primary:    '#3B82F6',
  primaryDim: 'rgba(59,130,246,0.12)',
  accent:     '#00D4B4',
  accentSoft: 'rgba(0,212,180,0.12)',
  cyan:       '#00D4B4',

  // Glows
  glowBlue:  'rgba(59,130,246,0.22)',
  glowGreen: 'rgba(0,212,180,0.22)',

  // Status
  success:     '#22C55E',
  successDim:  'rgba(34,197,94,0.12)',
  successBright:'#4ADE80',
  warning:     '#F59E0B',
  warningDim:  'rgba(245,158,11,0.12)',
  danger:      '#EF4444',
  dangerDim:   'rgba(239,68,68,0.12)',

  // Text
  textPrimary:   '#F0F4FF',
  textSecondary: '#8B9CC8',
  textMuted:     '#4A5578',
  textInverse:   '#090E1A',
} as const;

// ─── Font families ──────────────────────────────────────────────────────────

export const fontFamily = {
  regular:     'Inter_400Regular',
  medium:      'Inter_500Medium',
  semibold:    'Inter_600SemiBold',
  bold:        'Inter_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium:  'JetBrainsMono_500Medium',
  monoBold:    'JetBrainsMono_700Bold',
} as const;

// ─── Spacing & radius ───────────────────────────────────────────────────────

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, '3xl': 32, '4xl': 48,
} as const;

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 20, xl: 28, full: 9999,
} as const;

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  teal: { shadowColor: '#00D4B4', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
} as const;

// ─── Gradients ──────────────────────────────────────────────────────────────

export const gradients = {
  power:     ['#3B82F6', '#00D4B4'],
  battery:   ['#22C55E', '#00D4B4'],
  warning:   ['#F59E0B', '#EF4444'],
  powerSoft: ['#1e3a5f', '#0a3d34'],
} as const;

// ─── Expo template compat ───────────────────────────────────────────────────

export const Colors = {
  light:  { text: '#11181C', background: '#fff', tint: '#0a7ea4', icon: '#687076', tabIconDefault: '#687076', tabIconSelected: '#0a7ea4' },
  dark:   { text: '#ECEDEE', background: '#090E1A', tint: '#00D4B4', icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#fff' },
};

export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web:     { sans: 'system-ui, -apple-system, sans-serif', serif: 'Georgia, serif', rounded: "'SF Pro Rounded', system-ui, sans-serif", mono: 'SFMono-Regular, Menlo, monospace' },
});
