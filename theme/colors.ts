// HydroTech Design System — Color Tokens
// Light theme — Outdoor Premium (Strava / AllTrails direction)

export const colors = {
  // === Backgrounds (layered depth) ===
  bgBase:     '#F0F4F8',  // root background
  bgSurface:  '#FAFCFF',  // cards, panels
  bgElevated: '#FFFFFF',  // modals, overlays, tooltips
  bgInset:    '#E8EDF5',  // inset / recessed areas

  // === Borders ===
  border:       '#CBD5E1',
  borderMedium: '#94A3B8',
  borderStrong: '#475569',
  borderTeal:   'rgba(37,99,196,0.30)',
  borderBlue:   'rgba(27,79,155,0.25)',

  // === Primary accent — blue interactive ===
  teal:      '#2563C4',
  teal10:    'rgba(37,99,196,0.08)',
  teal20:    'rgba(37,99,196,0.16)',
  teal40:    'rgba(37,99,196,0.35)',
  tealGlow:  'rgba(37,99,196,0.12)',

  // === Navy primary ===
  blue:    '#1B4F9B',
  blue10:  'rgba(27,79,155,0.08)',
  blue20:  'rgba(27,79,155,0.16)',
  blueGlow:'rgba(27,79,155,0.12)',

  // === Sky data (big numbers) ===
  navy:    '#1B4F9B',
  data:    '#0EA5E9',
  data10:  'rgba(14,165,233,0.10)',
  data20:  'rgba(14,165,233,0.18)',
  dataGlow:'rgba(14,165,233,0.22)',

  // === Status ===
  success:     '#16A34A',
  success10:   'rgba(22,163,74,0.10)',
  success20:   'rgba(22,163,74,0.16)',
  warning:     '#D97706',
  warning10:   'rgba(217,119,6,0.10)',
  danger:      '#DC2626',
  danger10:    'rgba(220,38,38,0.10)',

  // === Text ===
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textInverse:   '#F0F4F8',
} as const;

export type ColorKey = keyof typeof colors;
