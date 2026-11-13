/**
 * App palette. primary / secondary / tertiary can be overridden from the
 * OpenCart admin (Extensions > Modules > Mobile App API) — see applyTheme().
 *
 * primary   buttons, links, active tab, selected options
 * secondary sale badges, special prices, wishlist hearts, count badges
 * tertiary  header and tab bar background
 * text      main font colour (textMuted is derived from it)
 * button    main button background ('' = primary); onButton = button text
 * accent    errors and destructive actions (always red)
 */
export const colors = {
  primary: '#1f6feb',
  primaryDark: '#1550b8',
  primarySoft: '#e8f0fe',
  onPrimary: '#ffffff',
  button: '#1f6feb',
  onButton: '#ffffff',
  secondary: '#e5484d',
  onSecondary: '#ffffff',
  tertiary: '#ffffff',
  onTertiary: '#1b1f24',
  tertiaryIsDark: false,
  accent: '#e5484d',
  success: '#2f9e44',
  warning: '#f08c00',
  text: '#1b1f24',
  textMuted: '#667085',
  border: '#e4e7ec',
  background: '#f6f7f9',
  surface: '#ffffff',
  star: '#f5a524',
  overlay: 'rgba(16, 24, 40, 0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const font = {
  small: 12,
  body: 14,
  medium: 16,
  large: 18,
  title: 22,
  hero: 28,
};

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** Mix `hex` with `other` (0 = hex, 1 = other). */
function mix(hex: string, other: string, amount: number): string {
  const a = rgb(hex);
  const b = rgb(other);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black, whichever reads better on `hex`. */
function readableOn(hex: string): string {
  const l = luminance(hex);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#ffffff' : '#1b1f24';
}

/**
 * Apply the colours sent by the store. Must run before any screen module is
 * loaded, because StyleSheet.create() copies colour values at import time —
 * App.tsx therefore require()s the navigator only after calling this.
 */
export function applyTheme(theme?: { primary?: string; secondary?: string; tertiary?: string; text?: string; button?: string; button_text?: string } | null) {
  if (!theme) return;

  if (theme.primary && HEX.test(theme.primary)) {
    colors.primary = theme.primary;
    colors.primaryDark = mix(theme.primary, '#000000', 0.25);
    colors.primarySoft = mix(theme.primary, '#ffffff', 0.9);
    colors.onPrimary = readableOn(theme.primary);
  }

  // Buttons follow primary unless the store sets its own colours
  colors.button = theme.button && HEX.test(theme.button) ? theme.button : colors.primary;
  colors.onButton = theme.button_text && HEX.test(theme.button_text) ? theme.button_text : readableOn(colors.button);

  if (theme.secondary && HEX.test(theme.secondary)) {
    colors.secondary = theme.secondary;
    colors.onSecondary = readableOn(theme.secondary);
  }

  if (theme.text && HEX.test(theme.text)) {
    colors.text = theme.text;
    colors.textMuted = mix(theme.text, '#ffffff', 0.35);
  }

  if (theme.tertiary && HEX.test(theme.tertiary)) {
    colors.tertiary = theme.tertiary;
    colors.onTertiary = readableOn(theme.tertiary);
    colors.tertiaryIsDark = colors.onTertiary === '#ffffff';
  }

  // Dark text on a light header/tab bar uses the store's font colour
  if (!colors.tertiaryIsDark) colors.onTertiary = colors.text;
}
