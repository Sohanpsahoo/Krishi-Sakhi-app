// Krishi Sakhi – Design Tokens
export const Colors = {
  // Emerald / Green theme (matching web app)
  primary: '#059669',       // emerald-600
  primaryDark: '#047857',   // emerald-700
  primaryLight: '#10b981',  // emerald-500
  primaryBg: '#ecfdf5',     // emerald-50
  primaryBorder: '#a7f3d0', // emerald-200

  // Accent palette
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  amber: '#d97706',
  amberBg: '#fffbeb',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  red: '#dc2626',
  redBg: '#fef2f2',
  teal: '#0d9488',
  cyan: '#0891b2',

  // Neutral
  white: '#ffffff',
  bg: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textLight: '#cbd5e1',
  border: '#e2e8f0',
  divider: '#f1f5f9',

  // Gradients (for LinearGradient)
  gradientPrimary: ['#059669', '#047857'] as const,
  gradientGreen: ['#10b981', '#059669'] as const,
  gradientBlue: ['#3b82f6', '#2563eb'] as const,
  gradientPurple: ['#8b5cf6', '#7c3aed'] as const,
  gradientAmber: ['#f59e0b', '#d97706'] as const,
  gradientDark: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)'] as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  hero: 34,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};
