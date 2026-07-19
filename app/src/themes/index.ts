import type { Theme } from '../core/theme/types'
import { THEME_VARS } from '../core/theme/types'
import { ensureFontLoaded, fontById } from './fonts'

/**
 * Paper — the launch default. Warm paper white, ink text, the teal brand
 * caret carried over from the seed at a depth that holds AA on light ground.
 */
export const paper: Theme = {
  id: 'paper',
  name: 'Paper',
  dark: false,
  font: 'jetbrains-mono',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.977 0.006 95)',
    surface: 'oklch(0.955 0.008 95)',
    ink: 'oklch(0.25 0.015 75)',
    muted: 'oklch(0.45 0.02 80)',
    faint: 'oklch(0.60 0.015 85)',
    accent: 'oklch(0.52 0.10 188)',
    caret: 'oklch(0.58 0.125 188)',
    ghost: 'oklch(0.62 0.02 85)',
    selection: 'oklch(0.72 0.10 188 / 0.25)',
    link: 'oklch(0.46 0.09 210)',
    border: 'oklch(0.885 0.010 92)',
    danger: 'oklch(0.52 0.18 25)',
  },
}

/**
 * Midnight — the dark pack: the same teal caret on near-black
 * (seed oklch(0.72 0.10 188)). More packs ship in Phase 2.
 */
export const midnight: Theme = {
  id: 'midnight',
  name: 'Midnight',
  dark: true,
  font: 'jetbrains-mono',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.16 0.012 250)',
    surface: 'oklch(0.205 0.014 250)',
    ink: 'oklch(0.90 0.012 220)',
    muted: 'oklch(0.67 0.018 230)',
    faint: 'oklch(0.44 0.014 240)',
    accent: 'oklch(0.72 0.10 188)',
    caret: 'oklch(0.78 0.115 188)',
    ghost: 'oklch(0.55 0.028 210)',
    selection: 'oklch(0.72 0.10 188 / 0.28)',
    link: 'oklch(0.75 0.09 200)',
    border: 'oklch(0.30 0.014 245)',
    danger: 'oklch(0.68 0.16 25)',
  },
}

/** Sakura — blossom-pink light; soft, springy. */
export const sakura: Theme = {
  id: 'sakura',
  name: 'Sakura',
  dark: false,
  font: 'lora',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.972 0.010 350)',
    surface: 'oklch(0.945 0.014 350)',
    ink: 'oklch(0.28 0.03 345)',
    muted: 'oklch(0.48 0.04 345)',
    faint: 'oklch(0.63 0.03 348)',
    accent: 'oklch(0.60 0.14 5)',
    caret: 'oklch(0.62 0.17 3)',
    ghost: 'oklch(0.66 0.03 348)',
    selection: 'oklch(0.72 0.13 5 / 0.22)',
    link: 'oklch(0.50 0.12 350)',
    border: 'oklch(0.885 0.014 350)',
    danger: 'oklch(0.52 0.18 25)',
  },
}

/** Terminal — pure black, phosphor green. The Monkeytype-est one. */
export const terminal: Theme = {
  id: 'terminal',
  name: 'Terminal',
  dark: true,
  font: 'ibm-plex-mono',
  caretStyle: 'block',
  vars: {
    bg: 'oklch(0.135 0.008 150)',
    surface: 'oklch(0.185 0.012 150)',
    ink: 'oklch(0.85 0.14 145)',
    muted: 'oklch(0.65 0.10 145)',
    faint: 'oklch(0.42 0.06 145)',
    accent: 'oklch(0.80 0.18 142)',
    caret: 'oklch(0.85 0.20 142)',
    ghost: 'oklch(0.50 0.06 145)',
    selection: 'oklch(0.80 0.18 142 / 0.25)',
    link: 'oklch(0.78 0.12 160)',
    border: 'oklch(0.28 0.03 148)',
    danger: 'oklch(0.65 0.20 28)',
  },
}

/** Sunset — dusk plum with a hot orange caret. */
export const sunset: Theme = {
  id: 'sunset',
  name: 'Sunset',
  dark: true,
  font: 'literata',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.20 0.035 300)',
    surface: 'oklch(0.245 0.04 300)',
    ink: 'oklch(0.90 0.025 60)',
    muted: 'oklch(0.70 0.04 45)',
    faint: 'oklch(0.48 0.04 320)',
    accent: 'oklch(0.72 0.15 45)',
    caret: 'oklch(0.74 0.17 40)',
    ghost: 'oklch(0.56 0.05 320)',
    selection: 'oklch(0.72 0.15 45 / 0.25)',
    link: 'oklch(0.75 0.10 20)',
    border: 'oklch(0.33 0.04 305)',
    danger: 'oklch(0.66 0.19 25)',
  },
}

/** Mist — cool gray-blue light; quiet office air. */
export const mist: Theme = {
  id: 'mist',
  name: 'Mist',
  dark: false,
  font: 'public-sans',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.965 0.006 240)',
    surface: 'oklch(0.94 0.008 240)',
    ink: 'oklch(0.28 0.02 250)',
    muted: 'oklch(0.47 0.025 250)',
    faint: 'oklch(0.62 0.02 245)',
    accent: 'oklch(0.52 0.11 255)',
    caret: 'oklch(0.55 0.14 258)',
    ghost: 'oklch(0.65 0.02 245)',
    selection: 'oklch(0.62 0.12 255 / 0.20)',
    link: 'oklch(0.47 0.12 260)',
    border: 'oklch(0.88 0.010 242)',
    danger: 'oklch(0.52 0.18 25)',
  },
}

/** Ember — charcoal with amber heat. */
export const ember: Theme = {
  id: 'ember',
  name: 'Ember',
  dark: true,
  font: 'jetbrains-mono',
  caretStyle: 'underline',
  vars: {
    bg: 'oklch(0.17 0.008 60)',
    surface: 'oklch(0.215 0.012 60)',
    ink: 'oklch(0.88 0.02 80)',
    muted: 'oklch(0.66 0.04 75)',
    faint: 'oklch(0.44 0.03 70)',
    accent: 'oklch(0.72 0.14 70)',
    caret: 'oklch(0.76 0.16 65)',
    ghost: 'oklch(0.52 0.04 70)',
    selection: 'oklch(0.72 0.14 70 / 0.24)',
    link: 'oklch(0.74 0.11 55)',
    border: 'oklch(0.30 0.02 62)',
    danger: 'oklch(0.62 0.19 28)',
  },
}

/** Snow — grayscale minimal; ink on white, graphite caret. */
export const snow: Theme = {
  id: 'snow',
  name: 'Snow',
  dark: false,
  font: 'atkinson',
  caretStyle: 'bar',
  vars: {
    bg: 'oklch(0.985 0 0)',
    surface: 'oklch(0.955 0 0)',
    ink: 'oklch(0.22 0 0)',
    muted: 'oklch(0.45 0 0)',
    faint: 'oklch(0.62 0 0)',
    accent: 'oklch(0.35 0 0)',
    caret: 'oklch(0.25 0 0)',
    ghost: 'oklch(0.68 0 0)',
    selection: 'oklch(0.5 0 0 / 0.18)',
    link: 'oklch(0.40 0.05 250)',
    border: 'oklch(0.90 0 0)',
    danger: 'oklch(0.52 0.18 25)',
  },
}

export const BUILTIN_THEMES: Theme[] = [
  paper,
  midnight,
  sakura,
  terminal,
  sunset,
  mist,
  ember,
  snow,
]

export function themeById(id: string): Theme {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? paper
}

/** Write a theme onto the document. Everything downstream reads CSS variables only. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.dataset.caretStyle = theme.caretStyle
  root.dataset.dark = theme.dark ? '1' : '0'
  root.style.colorScheme = theme.dark ? 'dark' : 'light'
  for (const key of THEME_VARS) {
    root.style.setProperty(`--c-${key}`, theme.vars[key])
  }
  root.style.setProperty('--font-editor', fontById(theme.font).stack)
  void ensureFontLoaded(theme.font)
}
