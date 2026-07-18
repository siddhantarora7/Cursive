import type { Theme } from './types'
import { THEME_VARS, isValidTheme } from './types'

/**
 * Shareable theme strings: `cv1.<base64url(JSON with short keys)>`.
 * Versioned so a future cv2 can change the encoding. Decoding untrusted
 * strings fails closed: anything malformed or smuggling non-color CSS → null.
 */

interface WireTheme {
  i: string // id
  n: string // name
  d: 0 | 1 // dark
  f: string // font id
  c: string // caret style
  v: string[] // vars in THEME_VARS order
}

export function encodeThemeString(theme: Theme): string {
  const wire: WireTheme = {
    i: theme.id,
    n: theme.name,
    d: theme.dark ? 1 : 0,
    f: theme.font,
    c: theme.caretStyle,
    v: THEME_VARS.map((k) => theme.vars[k]),
  }
  return 'cv1.' + b64urlEncode(new TextEncoder().encode(JSON.stringify(wire)))
}

export function decodeThemeString(s: string): Theme | null {
  if (!s.startsWith('cv1.')) return null
  const bytes = b64urlDecode(s.slice(4))
  if (bytes === null || bytes.length === 0) return null
  let wire: unknown
  try {
    wire = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
  if (typeof wire !== 'object' || wire === null) return null
  const w = wire as Partial<WireTheme>
  if (!Array.isArray(w.v) || w.v.length !== THEME_VARS.length) return null
  const vars = Object.fromEntries(THEME_VARS.map((k, idx) => [k, w.v![idx]])) as Theme['vars']
  const theme: Theme = {
    id: String(w.i ?? ''),
    name: String(w.n ?? ''),
    dark: w.d === 1,
    font: String(w.f ?? ''),
    caretStyle: w.c as Theme['caretStyle'],
    vars,
  }
  return isValidTheme(theme) ? theme : null
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function b64urlEncode(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!
    if (b !== undefined) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!
    if (c !== undefined) out += B64[c & 63]!
  }
  return out
}

function b64urlDecode(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null
  const out = new Uint8Array(Math.floor((s.length * 3) / 4))
  let o = 0
  for (let i = 0; i < s.length; i += 4) {
    const n = [0, 1, 2, 3].map((j) => (i + j < s.length ? B64.indexOf(s[i + j]!) : -1))
    if (n[0]! < 0 || n[1]! < 0) return null
    out[o++] = ((n[0]! << 2) | (n[1]! >> 4)) & 0xff
    if (n[2]! >= 0) out[o++] = ((n[1]! << 4) | (n[2]! >> 2)) & 0xff
    if (n[3]! >= 0) out[o++] = ((n[2]! << 6) | n[3]!) & 0xff
  }
  return out.slice(0, o)
}
