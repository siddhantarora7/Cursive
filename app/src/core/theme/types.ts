/** Theme system core types. Pure data — applying a theme to the DOM lives in src/themes. */

export const THEME_VARS = [
  'bg', // page background
  'surface', // toolbar / panels / popovers
  'ink', // body text
  'muted', // secondary text
  'faint', // hairlines, disabled
  'accent', // primary actions, active states
  'caret', // the hero
  'ghost', // ghost-text color
  'selection', // text selection background
  'link',
  'border',
  'danger',
] as const

export type ThemeVar = (typeof THEME_VARS)[number]

export type CaretStyle = 'bar' | 'block' | 'underline'

export interface Theme {
  id: string
  name: string
  dark: boolean
  /** OKLCH (or any valid CSS color) per variable. */
  vars: Record<ThemeVar, string>
  /** id from the curated font list (themes/fonts.ts) */
  font: string
  caretStyle: CaretStyle
}

const COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|(oklch|rgb|rgba|hsl|hsla|color)\([^)]{1,60}\)|[a-zA-Z]{3,20})$/

/** Validate untrusted theme data (share strings) — fail closed, never inject styles. */
export function isValidTheme(t: unknown): t is Theme {
  if (typeof t !== 'object' || t === null) return false
  const o = t as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string' || o.name.length > 40) return false
  if (typeof o.dark !== 'boolean' || typeof o.font !== 'string') return false
  if (o.caretStyle !== 'bar' && o.caretStyle !== 'block' && o.caretStyle !== 'underline') return false
  const vars = o.vars as Record<string, unknown> | undefined
  if (typeof vars !== 'object' || vars === null) return false
  return THEME_VARS.every((k) => typeof vars[k] === 'string' && COLOR_RE.test(vars[k] as string))
}
