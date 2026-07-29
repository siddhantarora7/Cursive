import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FEW_SHOT, systemPrompt, wrapContext } from './prompt'

/**
 * api/complete.ts must stay import-free to deploy as a Vercel function, so the
 * prompt is physically duplicated there. Both files say so in a comment, which
 * is worth exactly nothing the day someone edits one of them — the quality
 * filter's join contract depends on free-tier and BYOK requests being given the
 * same instructions, and a drift would show up as suggestions that are subtly
 * worse on one path only, which is close to undebuggable from the outside.
 *
 * So: compare the two for real. The server copy is read as text and its string
 * literals pulled out, because it cannot be imported.
 */
const server = readFileSync(new URL('../../api/complete.ts', import.meta.url), 'utf8')

/** Concatenate the single-quoted string literals inside a named function. */
function literalsIn(source: string, fnName: string): string {
  const start = source.indexOf(`function ${fnName}(`)
  if (start === -1) throw new Error(`${fnName} not found in api/complete.ts`)
  let depth = 0
  let i = source.indexOf('{', start)
  const open = i
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) break
  }
  const body = source.slice(open, i)
  return (body.match(/'(?:[^'\\]|\\.)*'/g) ?? []).join('').replace(/'/g, '')
}

describe('the two copies of the prompt', () => {
  it('gives the same system prompt on the free tier and on BYOK', () => {
    const client = systemPrompt('').replace(/'/g, '')
    expect(literalsIn(server, 'systemPrompt')).toContain(client)
  })

  it('wraps the draft identically', () => {
    // template literal, so compare the distinctive instruction text
    const tail = wrapContext('X').split('</draft>\n')[1]!
    expect(server).toContain(tail)
  })

  it('shows the same few-shot examples', () => {
    for (const shot of FEW_SHOT) {
      expect(server).toContain(shot.user)
      expect(server).toContain(shot.assistant.trim())
    }
  })

  it('still asks for the sentence to be finished', () => {
    // the fix for "pressing Tab never once produces a full stop"; measured at
    // 0% -> 98% of completions closing their sentence. Guard both copies.
    for (const source of [systemPrompt(''), server]) {
      expect(source).toContain('If the sentence can be finished within that, finish it')
    }
  })

  it('never lets a few-shot example model trailing off', () => {
    for (const shot of FEW_SHOT) {
      expect(shot.assistant.trim()).not.toMatch(
        /\b(and|or|but|the|a|an|to|of|in|for|with|into|that)$/i,
      )
    }
  })
})
