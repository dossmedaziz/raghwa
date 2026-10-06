import { createTheme } from '@shopify/restyle'

/** Palette from the Raghwa style guide (Base-inspired, deep blue + aqua). */
const light = {
  /** Page / card / sheet surface. */
  bg: '#FFFFFF',
  /** Brand navy that stays the same in dark mode (splash, logo tile). */
  brand: '#0B3B8F',
  primary: '#0B3B8F',
  primaryPressed: '#082C6B',
  primaryTint: '#EDF2FC',
  primarySoft: '#F3F6FD',
  primaryBusy: '#3D5E9E',
  aqua: '#22C4D6',
  aquaTint: '#E4F8FA',
  aquaInk: '#006B78',
  aquaInkDark: '#00535D',
  aquaLight: '#9FE7EF',
  ink: '#141414',
  grey700: '#454545',
  grey600: '#5E5E5E',
  grey500: '#6B6B6B',
  grey450: '#8A8A8A',
  grey400: '#AFAFAF',
  grey300: '#D6D6D6',
  grey200: '#E2E2E2',
  grey150: '#EEEEEE',
  grey120: '#F0F0F0',
  grey100: '#F3F3F3',
  grey50: '#F6F6F6',
  /** Literal white: text and icons on coloured fills. */
  white: '#FFFFFF',
  positive: '#0E8345',
  positiveInk: '#05713C',
  positiveTint: '#E6F4EC',
  warning: '#F5A623',
  warningInk: '#8A5A00',
  warningInkDark: '#6B4700',
  warningTint: '#FFF4DE',
  negative: '#D92D20',
  negativeInk: '#B3261E',
  negativeTint: '#FDECEA',
  negativePressed: '#F9D6D2',
  /** Dark pill behind white text (toast, location banner). */
  inverse: '#141414',
  /** Tunisian plates are black in both themes. */
  plate: '#141414',
  mapBase: '#EEF0F2',
  skyTint: '#EEF5FB',
  thumb: '#E9EFF6',
  thumbInk: '#7F93AE',
  decorA: '#CFF2F6',
  decorB: '#D3E3F6',
  decorLine: '#B9D3EE',
  transparent: 'transparent',
}

type Palette = typeof light

const dark: Palette = {
  bg: '#121417',
  brand: '#0B3B8F',
  primary: '#4A7BE0',
  primaryPressed: '#3A66C4',
  primaryTint: '#18233A',
  primarySoft: '#141D2E',
  primaryBusy: '#33508A',
  aqua: '#22C4D6',
  aquaTint: '#0D2F33',
  aquaInk: '#5ED6E3',
  aquaInkDark: '#7ADDE8',
  aquaLight: '#9FE7EF',
  ink: '#ECEEF0',
  grey700: '#C9CDD1',
  grey600: '#A3A9AF',
  grey500: '#8E949A',
  grey450: '#7C8288',
  grey400: '#5F656B',
  grey300: '#454A50',
  grey200: '#363A3F',
  grey150: '#2B2F33',
  grey120: '#262A2E',
  grey100: '#1F2226',
  grey50: '#1A1D20',
  white: '#FFFFFF',
  positive: '#22A060',
  positiveInk: '#5FD394',
  positiveTint: '#0F2E1E',
  warning: '#F5A623',
  warningInk: '#F3C063',
  warningInkDark: '#F6CC7C',
  warningTint: '#33270E',
  negative: '#E5483D',
  negativeInk: '#FF8A80',
  negativeTint: '#3A1715',
  negativePressed: '#4A1E1B',
  inverse: '#2E3238',
  plate: '#141414',
  mapBase: '#1D2023',
  skyTint: '#152029',
  thumb: '#1C2632',
  thumbInk: '#7F93AE',
  decorA: '#16363B',
  decorB: '#1A2A3F',
  decorLine: '#2B4560',
  transparent: 'transparent',
}

export type Scheme = 'light' | 'dark'

/**
 * Current palette. Swapped in place by `applyScheme` (App.tsx), which then remounts the UI,
 * so plain `colors.x` reads in render code always see the active theme.
 */
export const colors: Palette = { ...light }
let current: Scheme = 'light'
export function applyScheme(s: Scheme) {
  if (s === current) return
  current = s
  Object.assign(colors, s === 'dark' ? dark : light)
}
export const isDark = () => current === 'dark'

const base = {
  /** 4/8 grid */
  spacing: { 0: 0, xxs: 2, xs: 4, s: 8, sm: 12, m: 16, ml: 20, l: 24, xl: 32, xxl: 48, xxxl: 64 },
  borderRadii: { none: 0, plate: 6, s: 8, input: 12, m: 14, card: 16, l: 20, sheet: 24, pill: 999 },
  breakpoints: { phone: 0 },
  /** Families are swapped per language in <Text> (Cairo for Derja, Inter for French). */
  textVariants: {
    defaults: { fontSize: 16, color: 'ink' },
    display: { fontSize: 44 },
    h1: { fontSize: 32 },
    h2: { fontSize: 24 },
    h3: { fontSize: 20 },
    labelL: { fontSize: 17 },
    labelM: { fontSize: 14 },
    body: { fontSize: 16 },
    small: { fontSize: 13 },
    caption: { fontSize: 12 },
  },
}

export const theme = createTheme({ ...base, colors: light })
export const darkTheme = createTheme({ ...base, colors: dark })
export const themes: Record<Scheme, typeof theme> = { light: theme, dark: darkTheme }

export type Theme = typeof theme
export type Color = keyof Theme['colors']

/** Shadows from the style guide: pin / float / sheet. */
export const elevation = {
  pin: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  float: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sheet: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
} as const
