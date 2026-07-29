/**
 * Re-run the CURRENT quality filter over raw model responses already captured
 * by eval-suggestions.ts. Costs no API calls, so filter changes can be judged
 * against real model output instead of invented examples.
 *
 *   node --import ./scripts/register-ts.mjs scripts/revet.ts <results.json>
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDictionary } from '../src/core/autocorrect/dictionary.ts'
import { vetSuggestion } from '../src/core/suggestion/quality.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const DICT = parseDictionary(readFileSync(join(ROOT, 'src/assets/en-words.txt'), 'utf8'))
const isWord = (w: string): boolean => DICT.has(w)

interface Fx { id: string; context: string }
interface Row { fixture: string; model: string; variant: string; raw: string | null; vetted: string | null }

const fx: Fx[] = JSON.parse(readFileSync(join(HERE, 'fixtures/suggestions.json'), 'utf8'))
const rows: Row[] = JSON.parse(readFileSync(process.argv[2]!, 'utf8'))

let rescued = 0, dropped = 0, same = 0
for (const r of rows) {
  if (!r.raw) continue
  const ctx = fx.find((f) => f.id === r.fixture)!.context.slice(-1000)
  const now = vetSuggestion(r.raw, ctx, 12, isWord)
  if (r.vetted === null && now !== null) {
    rescued++
    console.log(`RESCUED  ${r.fixture.padEnd(22)}${JSON.stringify(now)}`)
  } else if (r.vetted !== null && now === null) {
    dropped++
    console.log(`DROPPED  ${r.fixture.padEnd(22)}${JSON.stringify(r.vetted)}`)
  } else same++
}
console.log(`\nrescued ${rescued} | newly dropped ${dropped} | unchanged ${same}`)
