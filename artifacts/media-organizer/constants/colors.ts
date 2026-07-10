/**
 * Semantic design tokens for Snapfolio — a smart media vault.
 * Dark mode is the primary, most polished experience; light mode mirrors it.
 */

const colors = {
  light: {
    text: '#14171B',
    tint: '#14A794',

    background: '#FAFAF9',
    foreground: '#14171B',

    card: '#FFFFFF',
    cardForeground: '#14171B',

    primary: '#0F9C8B',
    primaryForeground: '#FFFFFF',

    secondary: '#EFF1F1',
    secondaryForeground: '#14171B',

    muted: '#EFF1F1',
    mutedForeground: '#6B7280',

    accent: '#E8940A',
    accentForeground: '#2B1B02',

    destructive: '#E24444',
    destructiveForeground: '#FFFFFF',

    border: '#E5E6E8',
    input: '#E5E6E8',
  },

  dark: {
    text: '#F4F5F7',
    tint: '#35D0BA',

    background: '#0B0D10',
    foreground: '#F4F5F7',

    card: '#14171B',
    cardForeground: '#F4F5F7',

    primary: '#35D0BA',
    primaryForeground: '#04201C',

    secondary: '#1E2227',
    secondaryForeground: '#E4E6EA',

    muted: '#1A1D22',
    mutedForeground: '#8A9099',

    accent: '#F5B942',
    accentForeground: '#2B1B02',

    destructive: '#FF6B6B',
    destructiveForeground: '#2B0000',

    border: '#23262B',
    input: '#1E2227',
  },

  // Border radius (px) applied to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
