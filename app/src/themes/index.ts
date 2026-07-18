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

export const BUILTIN_THEMES: Theme[] = [paper, midnight]

export function themeById(id: string): Theme {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? paper
}

/** Write a theme onto the document. Everything downstream reads CSS variables only. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.dataset.caretStyle = theme.caretStyle
  root.style.colorScheme = theme.dark ? 'dark' : 'light'
  for (const key of THEME_VARS) {
    root.style.setProperty(`--c-${key}`, theme.vars[key])
  }
  root.style.setProperty('--font-editor', fontById(theme.font).stack)
  void ensureFontLoaded(theme.font)
}
