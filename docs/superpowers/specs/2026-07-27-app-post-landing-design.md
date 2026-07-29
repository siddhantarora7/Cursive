# Cursive — post-landing app work

Design for three independent milestones: free-tier exhaustion UX, suggestion
quality, and local stats + monthly Wrapped.

Approved 2026-07-27. Landing page (`src/landing/`) is out of scope and untouched.

---

## Sequencing

```
1.  Exhaustion UX          → verify
2a. Eval harness           → REPORT (gate: can free models carry the product?)
2b. Quality changes        → verify
3.  Stats + Wrapped        → verify
```

Task 2 is gated in the middle: the experiment result may collapse half of 2b's
scope, so it is run and reported before any prompt change is written.

---

## 1. Free-tier exhaustion UX

### The defect

`api/complete.ts` returns four distinct failure reasons — `disabled` (503),
`rate`, `cap`, `exhausted` (429). `src/ai/proxy.ts` collapses three into one:

```ts
return body.reason === 'rate' ? { cause: 'rate' } : { cause: 'cap' }
```

All three then render as *"free suggestions are done for today"*, which is false
for two of them. Network failure (`cause: 'net'`) renders nothing at all —
suggestions stop with no explanation. A user cannot distinguish "I hit my cap"
from "this AI is bad", and the second conclusion is permanent.

### Design

Policy and copy move into `core/`, where they can be unit-tested.

**`src/core/suggestion/status.ts`** (new, pure):

```ts
export type SuggestionStatus =
  | { kind: 'ready' }
  | { kind: 'off' }                          // aiMode off, or BYOK with no key
  | { kind: 'exhausted'; resumeAt: number }  // daily allowance spent
  | { kind: 'rate-limited'; retryAt: number }
  | { kind: 'unreachable'; retryAt: number } // providers errored, or network down
  | { kind: 'disabled' }                     // AI_DISABLED kill switch
```

with a pure `describeStatus(status, now, mode) → { text, cta?, tone }`. The
"resets at midnight" arithmetic and the exact wording become table-driven tests
instead of untested JSX.

### Changes by layer

| Layer | Change |
|---|---|
| `api/complete.ts` | None — already returns four reasons. |
| `src/ai/proxy.ts` | Stop collapsing: `cause: 'cap' \| 'disabled' \| 'exhausted' \| 'rate' \| 'net'`. |
| `core/suggestion/policy.ts` | Distinct resume rules: cap → local midnight; disabled → 10-min re-probe; exhausted/rate/net → backoff. Expose pure `statusAt(now)`. |
| `src/ui/StatusBar.tsx` | Render `describeStatus`. Exhausted → "Use your own key" opening Settings at the BYOK section. |

### Noise control

`unreachable` surfaces only after **two consecutive failures** — a single
two-second blip stays silent, a real outage names itself. This is a policy rule
in `core/`, so it is tested, not eyeballed.

### Invariants

- Typing is never blocked. The policy sits off the input path; proven by an e2e
  test that types a full paragraph while `/api/complete` is stubbed to 429.
- BYOK is one click from the exhausted state. That is the honest moment to
  introduce it.

---

## 2a. The experiment (gate)

`app/scripts/eval-suggestions.ts` — node, reads `.env.local` directly. Does not
route through Vercel and does not consume the Redis cap.

- **Corpus:** ~40 hand-written caret situations covering mid-word,
  sentence-start, post-punctuation, with-intent vs without, across four
  registers (narrative, technical, email, argument). Each carries a human note
  describing a good continuation.
- **Grid:** three free models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`,
  `gemini-2.5-flash-lite`) × prompt variants (current / voice-conditioned /
  intent-restructured).
- **Filter:** every response passes through the real `vetSuggestion`, so the
  measured reject rate is the shipping filter's reject rate.
- **Reported:** p50/p95 latency per model, filter reject rate, and hand-graded
  quality of the survivors.

**Known limitation, stated up front:** no BYOK-class key is available, so the
grid has no paid-model ceiling reference. The experiment can therefore show that
free models are *a* ceiling but cannot prove they are *the* ceiling. This is
recorded in the result rather than glossed.

The gate: report whether free models can carry the product, or whether "BYOK is
the product, free is the demo" is the correct conclusion.

---

## 2b. Suggestion quality

> **Outcome (2026-07-28): see `docs/SUGGESTION-QUALITY.md`.** The experiment
> rejected two of the three planned changes. Voice conditioning produced output
> identical to the baseline in 19/42 cases on 70B and was **not shipped**;
> restructured intent changed outputs but improved nothing measurable and was
> **not shipped**; the 70B-first chain order was **kept** (p50 300 ms, inside
> budget). Only the filter changes below were made, validated by replaying
> stored responses: 17 rescued, 0 newly dropped.

Shape as designed; specifics followed the experiment.

- **`core/text/context.ts`** gains `buildContext(fullText, budget)` →
  `{ voice: string[], immediate: string }`. Roughly 250 chars reserved for one
  or two complete earlier sentences **drawn from the same ≤1000-char window**,
  the rest for immediate pre-caret text.
- **Intent** gets a structured slot rather than being appended to the tail of a
  system-prompt sentence.
- **Quality filter** tightened against corpus failures, not guesses.
- **Chain order** revisited on latency data. 70B-first is the prime suspect for
  violating the p50 < 600 ms budget in `ARCHITECTURE.md`.

### Privacy contract

The ≤1,000-char claim appears in `src/ui/SettingsPanel.tsx` and in
`src/landing/copy.ts`. Voice conditioning is budgeted **inside** the existing
1,000 chars, so no copy changes anywhere and the landing page is never touched.
The contract is enforced as arithmetic with a length assertion in the test, not
as a promise in a comment.

---

## 3. Local stats + monthly Wrapped

### Current state

`core/stats/live.ts` is a rolling-WPM/combo counter for the FX glow only. The
`stats` IndexedDB store exists from v1 but nothing has ever written to it. Event
taps exist (`App.tsx` keystrokes, `ghost-text.ts` accepts) but nothing records
*suggestions shown*, so acceptance rate currently has no denominator. This is
build-from-scratch on existing hooks.

### Modules

```
core/stats/events.ts   StatEvent union
core/stats/daily.ts    pure (DayAggregate, StatEvent, now) → DayAggregate
core/stats/report.ts   pure (DayAggregate[], month) → MonthlyReport
store/stats.ts         debounced writes to the v1 `stats` store, flush on pagehide
ui/WrappedPanel.tsx    in-app report + 1080×1350 PNG (offscreen canvas, theme vars)
```

`DayAggregate`: date, keystrokes, words, secondsActive, `hourBuckets[24]`,
shown, acceptedAll, acceptedWord, filterRejects, and top-200 word counts
(lowercase, ≥4 chars, stopwords removed).

### Constraints

- Nothing is sent anywhere. Reducers are pure; the store is IndexedDB.
- Word frequency is new data-at-rest beyond the doc store. Local-only, but the
  Settings privacy note gains a line saying so.
- The PNG is the screenshottable artefact — the one naturally shareable thing
  this product can have without building a sharing feature.
- `prefers-reduced-motion` disables the reveal as a path, not a toggle.

---

## Out of scope

Payments, sharing, collaboration, accounts, sync, and anything in
`src/landing/`.

## Verification

Every milestone ends with `npx tsc --noEmit`, `npm test`, `npx playwright test`,
and `npm run build`, with output shown. Baseline at start of work: tsc clean,
84 unit tests, 8 e2e tests.
