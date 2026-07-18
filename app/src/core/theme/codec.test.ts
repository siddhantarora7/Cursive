import { describe, expect, it } from 'vitest'
import { decodeThemeString, encodeThemeString } from './codec'
import type { Theme } from './types'

const theme: Theme = {
  id: 'custom-abc',
  name: 'My Theme',
  dark: true,
  font: 'lora',
  caretStyle: 'block',
  vars: {
    bg: 'oklch(0.16 0.012 250)',
    surface: 'oklch(0.2 0.014 250)',
    ink: 'oklch(0.9 0.012 220)',
    muted: 'oklch(0.67 0.018 230)',
    faint: 'oklch(0.44 0.014 240)',
    accent: 'oklch(0.72 0.1 188)',
    caret: 'oklch(0.78 0.115 188)',
    ghost: 'oklch(0.55 0.028 210)',
    selection: 'oklch(0.72 0.1 188 / 0.28)',
    link: 'oklch(0.75 0.09 200)',
    border: 'oklch(0.3 0.014 245)',
    danger: '#e05252',
  },
}

describe('theme share strings', () => {
  it('round-trips a theme', () => {
    const s = encodeThemeString(theme)
    expect(s.startsWith('cv1.')).toBe(true)
    expect(decodeThemeString(s)).toEqual(theme)
  })

  it('is URL-safe', () => {
    const s = encodeThemeString(theme)
    expect(s).toMatch(/^cv1\.[A-Za-z0-9_-]+$/)
  })

  it('fails closed on malformed input', () => {
    expect(decodeThemeString('')).toBeNull()
    expect(decodeThemeString('cv1.')).toBeNull()
    expect(decodeThemeString('cv1.!!!not-base64!!!')).toBeNull()
    expect(decodeThemeString('cv9.abcdef')).toBeNull()
    expect(decodeThemeString('random garbage')).toBeNull()
  })

  it('rejects themes smuggling non-color CSS values', () => {
    const evil = structuredClone(theme)
    evil.vars.bg = 'red; } body { display: none'
    expect(decodeThemeString(encodeThemeString(evil))).toBeNull()
    const evil2 = structuredClone(theme)
    evil2.vars.ink = 'url(https://evil.example/x)'
    expect(decodeThemeString(encodeThemeString(evil2))).toBeNull()
  })

  it('survives fuzzing without throwing', () => {
    for (let i = 0; i < 200; i++) {
      const junk =
        'cv1.' +
        Array.from({ length: (i * 7) % 60 }, () =>
          String.fromCharCode(33 + ((i * 31) % 90)),
        ).join('')
      expect(() => decodeThemeString(junk)).not.toThrow()
    }
  })
})
