/**
 * Curated font list. Self-hosted via @fontsource (bundled woff2, no CDN at
 * runtime). Each font is a lazy chunk — only the active font's CSS is loaded.
 */

export interface CuratedFont {
  id: string
  label: string
  /** CSS font-family stack */
  stack: string
  mono?: boolean
  load: () => Promise<unknown>
}

export const FONTS: CuratedFont[] = [
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: `'JetBrains Mono Variable', ui-monospace, monospace`,
    mono: true,
    load: () => import('@fontsource-variable/jetbrains-mono'),
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    stack: `'IBM Plex Mono', ui-monospace, monospace`,
    mono: true,
    load: () => import('@fontsource/ibm-plex-mono'),
  },
  {
    id: 'newsreader',
    label: 'Newsreader',
    stack: `'Newsreader Variable', Georgia, serif`,
    load: () => import('@fontsource-variable/newsreader'),
  },
  {
    id: 'literata',
    label: 'Literata',
    stack: `'Literata Variable', Georgia, serif`,
    load: () => import('@fontsource-variable/literata'),
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: `'Lora Variable', Georgia, serif`,
    load: () => import('@fontsource-variable/lora'),
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    stack: `'Source Serif 4 Variable', Georgia, serif`,
    load: () => import('@fontsource-variable/source-serif-4'),
  },
  {
    id: 'public-sans',
    label: 'Public Sans',
    stack: `'Public Sans Variable', system-ui, sans-serif`,
    load: () => import('@fontsource-variable/public-sans'),
  },
  {
    id: 'atkinson',
    label: 'Atkinson Hyperlegible',
    stack: `'Atkinson Hyperlegible', system-ui, sans-serif`,
    load: () => import('@fontsource/atkinson-hyperlegible'),
  },
]

const loaded = new Set<string>()

export function fontById(id: string): CuratedFont {
  return FONTS.find((f) => f.id === id) ?? FONTS[0]!
}

export async function ensureFontLoaded(id: string): Promise<CuratedFont> {
  const font = fontById(id)
  if (!loaded.has(font.id)) {
    loaded.add(font.id)
    await font.load()
  }
  return font
}
