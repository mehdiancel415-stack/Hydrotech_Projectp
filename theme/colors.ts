// HydroTech Design System — Color Tokens
// Inspired by Linear, Nothing OS, Apple Health

export const colors = {
  // === Backgrounds (layered depth) ===
  bgBase:     '#090E1A',  // root background
  bgSurface:  '#0F1629',  // cards, panels
  bgElevated: '#161E35',  // modals, overlays, tooltips
  bgInset:    '#060A14',  // inset / recessed areas

  // === Borders ===
  border:       'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  borderTeal:   'rgba(0,212,180,0.25)',
  borderBlue:   'rgba(59,130,246,0.25)',

  // === Accent — teal électrique ===
  teal:      '#00D4B4',
  teal10:    'rgba(0,212,180,0.10)',
  teal20:    'rgba(0,212,180,0.20)',
  teal40:    'rgba(0,212,180,0.40)',
  tealGlow:  'rgba(0,212,180,0.22)',

  // === Accent secondaire — bleu ===
  blue:    '#3B82F6',
  blue10:  'rgba(59,130,246,0.10)',
  blue20:  'rgba(59,130,246,0.20)',
  blueGlow:'rgba(59,130,246,0.20)',

  // === Status ===
  success:     '#22C55E',
  success10:   'rgba(34,197,94,0.10)',
  success20:   'rgba(34,197,94,0.20)',
  warning:     '#F59E0B',
  warning10:   'rgba(245,158,11,0.10)',
  danger:      '#EF4444',
  danger10:    'rgba(239,68,68,0.10)',

  // === Text ===
  textPrimary:   '#F0F4FF',
  textSecondary: '#8B9CC8',
  textMuted:     '#4A5578',
  textInverse:   '#090E1A',
} as const;

export type ColorKey = keyof typeof colors;
