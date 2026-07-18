import type { Theme } from '../core/theme/types'
import { THEME_VARS } from '../core/theme/types'
import { ensureFontLoaded, fontById } from './fonts'

/**
 * Midnight — the launch default. The caret carries the brand: calm teal
 * (seed oklch(0.72 0.10 188)) on near-black. More packs ship in Phase 2.
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

export const BUILTIN_THEMES: Theme[] = [midnight]

export function themeById(id: string): Theme {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? midnight
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
