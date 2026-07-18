# Cursive — Architecture

> **Identity:** Monkeytype for writing, with Copilot built in. The most satisfying place on the internet to type.
> **Prime directive:** feel and demoability are correctness requirements. Any feature that adds input latency or drops frames loses, no matter how useful.
> **Anti-scope:** not a document suite. No collaboration, no accounts, no whole-document AI. The only agentic feature ever allowed is scoped prompt-to-edit on an explicit selection (Phase 3).

This document is the Phase 0 design. Nothing here is code yet; every section ends in decisions, and open questions are collected at the end of the Phase 0 review (asked in chat, not in this file).

---

## 1. Stack and repo layout

- **Build:** Vite + TypeScript. Plain Vite SPA — no Next.js. The editor hot path must stay framework-light, we have no server-rendered pages, and Vercel's Vite preset serves `/api/*.ts` files as serverless/edge functions alongside the static app, which is all the backend we need.
- **Editor:** TipTap 2 (ProseMirror). We never hand-roll contenteditable.
- **Chrome UI:** React 18, strictly for toolbar/menus/settings/doc-list/panels. React never sits between a keystroke and the document.
- **State:** no global state library. Editor state lives in ProseMirror. Chrome state is small enough for React context + a few stores.
- **Persistence:** IndexedDB via the `idb` micro-wrapper (~1 kB). Dexie is nicer but is a dependency and an abstraction we don't need for three object stores.
- **Server:** Vercel Edge Functions in `/api` (Edge runtime, not Node — lower cold-start latency, and Upstash Redis speaks REST so it works on Edge). Upstash Redis free tier for caps/rate limits.
- **Tests:** Vitest. Everything in `core/` is pure TS and unit-tested. CI: typecheck → test → build → Vercel preview per PR (GitHub Actions).

```
/app
  /api                      # Vercel Edge Functions (the AI proxy)
    complete.ts             #   POST — free-tier completion (Groq → Gemini chain)
    passthrough.ts          #   POST — BYOK pass-through for CORS-blocked providers
    redeem.ts               #   POST — redemption-code verification (Phase 3)
  /src
    /core                   # PURE TS. No DOM, no fetch, no TipTap imports. Unit-tested.
      suggestion/           #   policy state machine, context extraction, quality filter,
                            #   LRU cache, backoff — everything decidable without I/O
      stats/                #   event reducers: WPM, streaks, acceptance, heatmap (Phase 3)
      theme/                #   Theme type, validation, share-string codec
      text/                 #   word/char counting, context-window slicing
    /editor                 # TipTap/ProseMirror layer. Framework-light (no React).
      extensions/           #   ghost-text plugin, smooth caret, prompt-to-edit diff (P3)
    /ai                     # client-side transport: provider adapters, request runner
    /store                  # IndexedDB access, autosave, anonymous client ID, settings
    /themes                 # built-in theme packs (TS objects → CSS variables)
    /fx                     # canvas effects layer (Phase 2): particles, streaks, shake
    /sound                  # sound packs (Phase 2)
    /ui                     # React chrome: menu bar, toolbar, settings, docs list,
                            #   caps meter, notices, find/replace, export
/docs                       # this file, ROADMAP.md, PRIVACY source
```

**The `core/` wall is the load-bearing rule.** `core/` modules take plain data in and return plain data out (decisions, reducers, codecs). The editor, the proxy, tests, and a future browser extension all consume the same policy. Enforced by an ESLint boundary rule (`core/` may not import from any sibling) and by Vitest running `core/` in a node environment where DOM globals simply don't exist.

---

## 2. Ghost text — ProseMirror decoration strategy

The single most correctness-critical piece. Ghost text must be visible, styled, positioned at the caret — and **never real document content**.

### Mechanism

One ProseMirror plugin (`ghostText`) owning:

- **Plugin state:** `{ suggestion: string | null, consumedChars: number, anchor: number, requestId: number }`, remapped through every transaction via `tr.mapping`.
- **Rendering:** a single **widget decoration** at the caret position (`side = 1`, i.e. after the cursor) whose DOM is a `<span class="ghost-text" aria-hidden="true">` containing the not-yet-consumed remainder of the suggestion. Widget decorations are the whole safety story:
  - **Undo:** decorations are not document content; they never enter history. Nothing to undo until accept.
  - **Copy/paste:** ProseMirror serializes the document, not decorations. Ghost text can never be copied.
  - **Word count / export / persistence:** all read `state.doc`. The suggestion is unreachable from the doc by construction.
  - **Accessibility:** `aria-hidden` + `user-select: none`; screen readers and selection never see it.

### Interactions (the exact contract)

| Input | Behavior |
|---|---|
| `Tab` | Accept all: one transaction inserting the remaining suggestion text at the caret. Single undo step (explicitly closed history group before and after), tagged with tr meta `ghostAccept` so the accept animation can find the inserted range. |
| `Ctrl/Cmd+→` | Accept one word: insert through the next word boundary; remainder stays as the live suggestion (no re-request). |
| `Esc` | Dismiss; also sets a "cooled" flag so we don't instantly re-request the identical context. |
| Typing a char that **matches** the suggestion's next char | Consume-and-advance: the char inserts into the doc normally (it's the user's keystroke, belongs in undo as typing), `consumedChars++`, the widget re-renders minus one leading char. Zero flicker because the visual text is unchanged — pixels that were ghost become real. |
| Typing a non-matching char, selection move, click, blur | Dismiss + cancel any in-flight request (AbortController). |
| IME composition (`compositionstart`) | Dismiss and suppress requests until `compositionend`. Ghost text and IME popovers must never fight. |
| Accept while suggestion is stale (doc changed under it) | Impossible by construction: any doc change either advances (match) or dismisses (mismatch), and `anchor` is remapped, so the widget is always adjacent to the caret or gone. |

**Accepted-text animation:** on a `ghostAccept` transaction, add a transient *inline* decoration over the inserted range with a class running a ~150 ms opacity fade (CSS only, opacity is compositor-friendly), removed by the plugin afterwards. No layout properties animated; the text occupies its final position from frame one.

**Tab-key ergonomics:** Tab accepts only when a suggestion is visible; otherwise it falls through to the editor's normal behavior (list indent / focus escape per accessibility norms). This matters — Tab-trapping an editor with no suggestion visible is a WCAG failure.

### Request pipeline (policy in `core/suggestion`, I/O in `ai/`)

The policy is a pure state machine: `(event, state, now) → { state', action }` where events are `typed | moved | idle-tick | response | error | accept | dismiss` and actions are `none | request(context) | cancel`. Rules it encodes (all unit-tested, all constants in one config object):

- Request only after **400 ms** of no input **and** ≥ 3 words before the caret **and** not mid-composition, not in a code block. **Mid-word triggering is deliberate**: completing the word being typed is a core demo moment. The context slice ends exactly at the caret (partial word included); the quality filter verifies the suggestion is a plausible continuation of the partial word (or starts with a space when the word looks complete) and drops it otherwise.
- Context: ≤ ~1,000 chars before the caret (sliced at a word boundary) + the document-intent string as system context. Nothing after the caret, nothing else, ever.
- Completion: ≤ 12 words (`max_tokens` ≈ 40 plus client-side truncation at the 12th word boundary), temperature ≈ 0.3, stop sequences `\n\n`.
- **Quality filter — a bad suggestion is worse than none.** Drop silently if: empty/whitespace; repeats the tail of the context; starts by re-typing the current word incorrectly; contains markdown/formatting junk or model chatter ("Sure, here"); is a single punctuation mark. Normalize leading-space against context so we never render `wordword`.
- **LRU cache** (~64 entries) keyed on `hash(context + intent + model)`. Consume-and-advance keeps a cache entry warm: backspacing then retyping hits cache, which demos beautifully.
- **Exponential backoff** on failure/429 (1 s → 2 s → 4 s → … cap 60 s), reset on success. A daily-cap-exhausted response (HTTP 429 with `{reason:"cap"}`) pauses requests until local midnight instead of backoff.
- **AbortController** on every request; any new keystroke aborts in-flight fetches.

---

## 3. Smooth caret

Native caret hidden (`caret-color: transparent`); ours is a single absolutely-positioned DOM element (2 px rounded bar by default) inside the editor's scroll container, moved with `transform: translate(...)` only (GPU-composited, `will-change: transform`).

- **Interpolation:** rAF loop lerping current → target position (`coordsAtPos(selection.head)`), Monkeytype-style exponential smoothing (configurable factor; "off" = snap). The loop runs **only while the caret is moving or blinking on** — it parks when idle and on `visibilitychange`.
- **Shared position source:** one `caretGeometry` module computes caret coordinates per relevant transaction and publishes `{x, y, lineHeight}` to subscribers: smooth caret, effects layer (particle origin), demo-mode captions. `coordsAtPos` is called once per keystroke, not once per consumer.
- **Styles:** line / block / underline, blink style, color from theme variable. Config lives in settings; `prefers-reduced-motion` forces smoothing off (instant caret) and disables blink animation.

---

## 4. Canvas effects layer (Phase 2 — architecture fixed now)

A single `<canvas>` overlaying the editor: `position: absolute; inset: 0; pointer-events: none;`, sized to the editor viewport × `devicePixelRatio` (capped at 2).

- **Decoupling contract:** the input path never waits on the effects layer. Editor code does exactly one thing per keystroke: push a tiny event (`{type:'key', x, y, char, ts}`) into a pre-allocated ring buffer. The FX system drains the buffer inside its **own** rAF loop. If the FX loop dies or janks, typing is untouched — that's the hard guarantee, enforced structurally, not by optimization.
- **Particle system:** fixed-size object pool (e.g. 512 particles, plain preallocated `Float32Array`-backed slots — zero allocation per frame, zero GC pressure). Additive-blend sparks from the caret position on keystroke; combo streak = sustained-WPM glow (WPM fed from `core/stats` live counter); screen shake = CSS transform on a wrapper, OFF by default.
- **Performance budget (hard):** FX frame ≤ 2 ms on a mid-tier laptop; if a rolling p95 frame time exceeds 8 ms, the system degrades itself (halve pool, then disable) and logs to the perf HUD. rAF loop fully parks when no particles are alive and combo is idle. `prefers-reduced-motion` disables the layer entirely.
- **Toggles:** every effect individually switchable; all OFF states remove the rAF loop, not just the drawing.
- **Manual perf checklist** (Phase 2 exit criteria): keystroke-to-paint latency measured with the Performance API + `PerformanceObserver('event')`, 60 fps sustained in a 60 s typing session with all effects on, on a throttled (4× CPU) DevTools profile.

---

## 5. AI provider abstraction

### One interface, two transports

```ts
interface CompletionRequest { context: string; intent?: string; maxWords: number; signal: AbortSignal }
interface CompletionResult  { text: string; provider: string; quota?: { used: number; limit: number } }

interface ProviderAdapter {
  id: 'proxy' | 'openai' | 'anthropic' | 'gemini' | 'openrouter';
  transport: 'proxy' | 'direct' | 'proxy-passthrough';
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
```

The editor knows only `ProviderAdapter`. Swapping models/providers is config, not refactor: the free-tier chain, model IDs, and endpoints are env vars on the proxy; BYOK adapters read model IDs from a settings-editable table with defaults.

### Free tier — `/api/complete` (Edge)

1. Validate body (context ≤ 1,200 chars hard cap server-side, intent ≤ 300).
2. **Kill switch:** `AI_DISABLED=1` env → 503 `{reason:"disabled"}` instantly.
3. **Per-IP rate limit:** Upstash sliding window (e.g. 20 req/min) — protects the keys even if client IDs are forged.
4. **Daily cap:** `INCR cap:{clientId}:{YYYY-MM-DD}` with 48 h TTL; over `DAILY_CAP` (default 150) → 429 `{reason:"cap", used, limit}`. `clientId` is an anonymous UUID minted client-side into localStorage. (It is trivially resettable — see open question on pairing it with a per-IP daily ceiling.)
5. **Provider chain from env**, e.g. `PROVIDER_CHAIN=groq:llama-3.1-8b-instant,gemini:gemini-flash-lite-latest`. Try in order; on 429/5xx/timeout (2.5 s budget) fall through. All exhausted → 429 `{reason:"exhausted"}`.
6. Response includes remaining quota for the visible meter. **No content logging anywhere** — request bodies never reach `console.*` in proxy code, and this is a stated privacy guarantee.

Degraded state in the client: editor fully functional, ghost text paused, one quiet dismissible notice — "free suggestions are done for today — add your own key for unlimited." Never a modal, never nagging.

### BYOK — per-provider CORS strategy (documented here, mirrored in code comments)

| Provider | Browser CORS | Strategy |
|---|---|---|
| Anthropic | ✅ with `anthropic-dangerous-direct-browser-access: true` header | Direct from browser |
| Gemini (AI Studio) | ✅ | Direct from browser |
| OpenAI | ✅ (api.openai.com sends permissive CORS) | Direct from browser; if a key/org fails preflight in practice, adapter falls back to pass-through |
| OpenRouter | ✅ (explicitly browser-friendly) | Direct from browser |

`/api/passthrough` exists for any provider that blocks CORS (and as the OpenAI fallback): the user's key travels per-request in a header, is forwarded, **never stored, never logged**; the function has logging disabled for bodies/headers by construction. Keys live only in localStorage. BYOK requests skip caps entirely.

**Training disclosure:** free-tier requests may be used for training by Groq/Google per their free-API terms. Stated plainly on the PRIVACY page **and** inline in settings next to the Free/BYOK choice.

---

## 6. IndexedDB schema

Database `cursive`, `idb` wrapper, versioned migrations from v1.

| Store | Key | Value | Notes |
|---|---|---|---|
| `docs` | `id` (uuid) | `{ id, title, content: PMJson, intent, createdAt, updatedAt, wordCount }` | `title` derived from first line unless renamed. Index on `updatedAt` for the doc list. |
| `settings` | fixed key `"settings"` | one versioned object: theme id/custom theme, caret config, effect+sound toggles, provider choice, font prefs, meter state | Single-object store → atomic reads/writes, trivial migration. |
| `stats` | `date` (`YYYY-MM-DD`) | daily aggregate: keystrokes, wpmSamples (compact), tabAccepts, suggestionsShown, secondsActive | Phase 3 writes it; store created in v1 so no migration later. |
| `blobs` | `id` | image blobs | **Phase 4 only** — created by a v2 migration then, listed here for the record. |

- **Autosave:** debounced 800 ms after last change + forced flush on `visibilitychange`/`pagehide`. Doc content stored as ProseMirror JSON (canonical, survives schema-compatible upgrades).
- **Not in IndexedDB:** BYOK keys and the anonymous client ID (localStorage, by spec); nothing ever server-side.
- **Multi-tab:** last-writer-wins per doc with a `BroadcastChannel` heads-up ("this doc is open in another tab"). v1 does not merge.
- Everything works offline except AI; the app is a static bundle. (Whether we add a service worker for full offline *launch* is an open question — leaning no for v1.)

---

## 7. Theme system

A theme is **data**: `{ id, name, dark: boolean, vars: Record<CssVar, string>, fontFamily, caret: { style, color? } }` — a flat pack of CSS custom properties (`--bg`, `--surface`, `--ink`, `--muted`, `--accent`, `--caret`, `--ghost`, `--selection`, `--toolbar-bg`, …). Applying a theme = writing vars onto `document.documentElement` + `data-theme` attribute. Everything — chrome, editor, caret, ghost text, even canvas particle colors (read once per theme switch, not per frame) — consumes variables only.

- **Built-ins (~8):** paper, midnight, sakura, terminal, sunset, + 3 TBD. Defined as TS objects in `/themes` so the builder, the share codec, and CSS generation share one source of truth. Colors authored in OKLCH.
- **Default theme seed:** the anchor color for the launch default is `oklch(0.72 0.10 188)` (calm teal) as caret + accent on a near-black ink/paper scheme — the caret is the hero of every screen recording, so it gets the brand color. Full palettes are Phase 1/2 design work, not Phase 0.
- **Custom builder (Phase 2):** edits a copy of any built-in; fonts from the curated list only.
- **Share strings:** `cv1.<base64url(deflate(JSON with short keys))>` — versioned prefix, `core/theme` codec is pure and fuzz-tested (malformed strings must fail closed, never inject styles: values validated as colors before applying).

Fonts: ~8 curated families, self-hosted woff2 subsets (no external font CDN at runtime), preloaded for the active theme.

---

## 8. Stats & Wrapped (Phase 3, contracts fixed now)

- `core/stats` is an event-sourced reducer: input events (`key`, `accept`, `sessionStart/End`) → live state (rolling WPM, streak, combo for FX) + daily aggregates (persisted to the `stats` store). Pure, tick-driven, fully unit-testable with synthetic event streams.
- **Wrapped:** monthly 1080×1350 PNG rendered on an offscreen canvas from daily aggregates; persona derived in `core/` from stat shape; one-click download. Local-only.
- **Redemption codes:** short signed tokens (HMAC-SHA256, secret on the proxy). `/api/redeem` verifies signature + expiry + single-use (Upstash `SET NX`), then flags the clientId uncapped (`uncapped:{clientId}`, checked by `/api/complete`). Client stores the redeemed state for the meter UI.

## 9. Prompt-to-edit (Phase 3, decoration strategy fixed now)

Selection + `Cmd/Ctrl+K` → floating instruction input → provider returns rewrite → **inline diff rendered as decorations**: deletions = inline decoration (strike + red tint) over existing text, additions = widget decorations (green tint) at insertion points — the document is **not** modified during preview (same safety argument as ghost text: history, copy, counts untouched). Word-level diff computed in `core/` (Myers). `Enter` applies as one transaction (one undo step); `Esc` discards. Sent: selection + instruction + ≤ 500 chars surrounding context + intent. Same adapter, same caps. **Hard wall: no API surface for whole-document input — the request builder takes a selection range, period.**

---

## 10. Performance budgets (product-wide, CI-adjacent)

| Metric | Budget |
|---|---|
| Added input latency from our layers (caret, FX, ghost) | ≤ 1 ms on the input path (structurally: nothing but PM handling + one ring-buffer push) |
| Frame rate while typing, all effects on | 60 fps on a mid-tier laptop (4× CPU-throttled DevTools check) |
| FX frame cost | ≤ 2 ms, self-degrading past p95 8 ms |
| Ghost-text render | one widget decoration update; no sync layout reads in the update path |
| Suggestion round-trip (free tier, Groq) | target p50 < 600 ms — latency is quality |
| Bundle (Phase 1, gz) | < 250 kB JS; KaTeX/etc. are Phase 4 lazy chunks |

## 11. Testing strategy

- **`core/` (Vitest, node env):** suggestion policy state machine (table-driven: event sequences → expected actions), quality filter corpus (good/bad completion fixtures), LRU, backoff timing (fake timers), stats reducers, theme codec round-trip + malformed-input fuzz, diff algorithm (P3).
- **Editor plugins (Vitest + jsdom):** ghost-text plugin transaction logic — accept/dismiss/consume-advance/remap — via headless ProseMirror `EditorState` (no browser needed for transaction-level tests).
- **Proxy (Vitest):** handler functions with mocked fetch + mocked Upstash — chain fallback, caps, rate limit, kill switch, redeem.
- **Feel (manual, checklists in `/docs`):** latency/fps protocol per Phase 2, demo-mode recording pass before each release.

## 12. Privacy posture (summary; PRIVACY page is the canonical text)

Sent to AI endpoints, only at suggestion time: ≤ ~1,000 chars before caret + intent (+ selection & ~500 chars for prompt-to-edit). Nothing stored server-side, no accounts, no analytics on content. Free tier: upstream providers may train on inputs — disclosed at the point of choice. BYOK: keys in localStorage only; direct-to-provider where CORS allows; pass-through proxy never stores or logs keys or content.

---

## 13. Phase 0 review decisions (2026-07-17)

1. Menu bar deferred to the end of Phase 1, trimmed to menus with real items.
2. Docs list is a popover doc-switcher, not a sidebar.
3. Free-tier caps: per-client 150/day **and** per-IP ceiling ~400/day.
4. Suggestions trigger mid-word (see §2) — completing the current word is the point. Autocorrect stays out of v1 (ROADMAP).
5. Native browser spellcheck stays **on** by default (toggle in settings).
6. First-run default theme: **midnight** (dark, teal `oklch(0.72 0.10 188)` caret/accent).
7. Desktop-first: mobile usable but not a polish target for v1.
8. Basic Zen mode (chrome fade) ships in Phase 1; full treatment in Phase 2.
9. Slim bottom status strip: word count + caps meter (+ live WPM in Phase 3); fades in Zen.
