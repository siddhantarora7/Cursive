# Landing page redesign — design

Date: 2026-07-27
Status: approved

Replaces the entire `app/src/landing/` tree. The previous landing page (commit
408cff7, reverted in 83def4c) is deleted rather than edited.

## Brief

A marketing surface for Cursive — a local-first browser writing editor with
inline ghost-text completions (Tab to accept), a smooth animated caret, themes,
typing effects, and selection-scoped Cmd+K edits.

Register: **brand** (design IS the product). Note this differs from the
`product` register recorded in `PRODUCT.md`, which describes the editor app.
Impeccable's routing takes the task cue first, and the task is a landing page.

Audience: anyone who writes a lot. Not narrowed to students, so specificity has
to come from concrete scenarios in the copy rather than from naming a persona.

## Reference contract

Four named references, agreed with the owner, each mapped to a specific beat:

| Reference | What we take | Where |
|---|---|---|
| wisprflow.ai | Cream field, two-tone display headline, curved SVG text marquees, the centered capsule | Hero |
| cluely.com | Dynamic filled/neutral card pairs with inline chips in headings, metric pill row, soft 3-up | Beats 03, 05, 09 |
| slapshift.app | Pixel scene as a ground plane the page stands on | Finale |
| experientiallabs.ai | Scroll-driven word-by-word reveal against a vertical hairline with a traveling dot | Manifesto |

The references diverge in palette. Cream wins; the other three are re-tinted
onto it.

## Aesthetic lane — declared risk

`reference/brand.md` lists **editorial-typographic** (display serif + small mono
labels + monochrome restraint) as a currently-saturated reflex lane. This design
sits in it. It is retained under the identity-preservation clause: Cursive
already ships Baskervville, `#FDFCF0` is an existing committed brand token, and
the owner selected this lane deliberately against named references.

Because the lane is saturated, execution carries the distinctiveness. Two rules
follow directly and are binding:

1. **No mono eyebrow above section headings.** Repeated tracked uppercase labels
   as section grammar are banned. Mono appears only in the hero meta line, the
   metric strip, keycap labels, the theme name, and the privacy facts.
2. **No uniform scroll-reveal.** A single fade-and-rise wrapper applied to every
   section is the named AI tell. Motion is authored per section, and several
   sections have no entrance motion at all.

## Design system

### Color

One background for the whole document: `#FDFCF0`. Every section is transparent.
Separation comes from spacing, hairlines, and warm shadows — never a background
swap. Filled **cards** are permitted and are the single exception (beat 05).

| Token | Value | Role |
|---|---|---|
| `cream` | `#FDFCF0` | page, everywhere |
| `sheet` | `#FFFEF8` | raised surfaces (capsule, mocks) |
| `ink` | `#1A1A1A` | accepted text, headlines |
| `muted` | `#8A8A8A` | ghost text, upcoming words |
| `blue` | `#2B3A67` | CTAs, the ribbon, the filled card |
| `red` | `#C8492E` | corrections only — max 3 appearances |
| `hairline` | `#E4E1D2` | borders |

Strategy: **restrained**, with one committed surface (the ink-blue card).
Contrast: `ink`/`cream` = 15.8:1. `muted`/`cream` = 3.5:1 — therefore `muted` is
never used for body copy, only for ghost text and not-yet-revealed words, which
are decorative and have ink-colored equivalents present. Body copy is `ink`.

### Type

- Display: **Baskervville** (self-hosted, already a dependency)
- Body: **Public Sans Variable**
- Meta: **JetBrains Mono Variable**, 0.6875rem, `letter-spacing: 0.12em`, uppercase

Hero `clamp(2.75rem, 7vw, 6rem)` — max is the 6rem skill ceiling and 2.18× the
min, inside the 2.5× bound. Display `letter-spacing: -0.02em`, never below
-0.04em. `text-wrap: balance` on h1–h3, `pretty` on prose. Body measure capped
at 68ch. Body never below 1rem.

### Motion

`motion` v12 (`useScroll`/`useTransform`) plus native `position: sticky`. **No
new dependencies.** Easing is `ease-out-quart`/`quint`/`expo` only; no bounce,
no elastic. Nothing intercepts the wheel, and no programmatic smooth-scroll —
a pinned section can always be flicked past at the reader's own speed.

`prefers-reduced-motion: reduce` is a first-class path, not a switch: pinned
wrappers lose their extra height and render the finished frame, marquees drop
their SMIL nodes, and looping demos render their final state.

## Structure — 12 beats

```
01  Nav          sticky pill, shrinks + dims while a pin is engaged
02  Hero         "Type half. Tab the rest." + marquees + typing capsule
03  Meta strip   three mono metric pills
04 ●Ghost text   PINNED, 3 stages: type → ghost → Tab → ink
05  Two-up       ink-blue filled card / cream hairline card
06 ●Manifesto    PINNED, word-by-word against a hairline
07  Three keys   "The entire interface." Tab · ⌘K · Esc
08 ●Themes       PINNED, real BUILTIN_THEMES crossfading
09  Three-up     caret · sound and effects · autocorrect
10  Trust        "Your documents never leave this browser."
11  Plans        Free / bring your own key, then the GitHub band
12  Finale       pixel ground plane, CTA, footer
```

### 02 Hero

Headline two-tone: `Type half.` in ink, `Tab the rest.` in muted, transitioning
to ink 900ms after paint over 400ms, once. The headline performs the product
before any copy is read. Under reduced motion it renders already-ink.

Two curved SVG marquees behind: a back curve carrying a rough message in faint
muted text on a transparent path, and a front curve — a thick `blue` stroke —
carrying the corrected version in cream. Both scroll via SMIL
`<animate attributeName="x">`, so there is zero per-frame JavaScript. Hidden
below `md`, `aria-hidden`.

**The capsule.** Sheet fill, 2px ink border, fully rounded, sitting where the
curves cross. A continuously marqueeing field of bars (transform-only CSS
animation) with a split at ~62%: bars left of the split are ink, bars right are
muted — the suggestion. Every ~6s the Tab keycap beneath ticks and the split
animates to 100% via `clip-path: inset()`, turning the whole field ink, then
resets. Bar heights come from a fixed seeded sequence, identical every load.

### 04 Ghost text — pinned, 3 viewports

An editor mock. Scroll progress splits into three stages; within each, character
count is a function of progress, so scrolling back rewinds the typing. Ghost
text fades in muted, the Tab keycap depresses, the ghost becomes ink. Ambient
keycaps drift behind at low opacity.

### 05 Two-up

Left card: `blue` fill, cream text, heading with an inline chip — "Cursive
`drafts` as you write". Right card: cream, hairline border, warm shadow —
"When it's not right, `⌘K` rewrites it". Each holds a small live mock. Single
column below `md`. No nested cards.

### 06 Manifesto — pinned

Hairline down the center. Words right-aligned against it, one per line. Each
word's color is a function of `progress − index/total`: passed words ink,
upcoming words fading toward muted at low opacity. A dot descends the hairline.

> You don't lose the sentence to not knowing the words.
> **You lose it to the pause.**

The second line is `red` — one of its three permitted appearances.

### 07 Three keys

`Tab` / `⌘K` / `Esc` as large warm-shadow keycaps, labeled in mono. The ambient
drifting keycaps rise to full strength here and recede after, so the motif pays
off rather than staying wallpaper. Keycaps are CSS: layered warm shadows tuned
for cream, not the reference's cool blue-gray, which only works on cool ground.

### 08 Themes — pinned

One paragraph held still while the mock's CSS custom properties crossfade
through all eight real `BUILTIN_THEMES` — background, ink, caret, accent —
driven by scroll index. Theme name printed in mono.

### 09 Three-up

Three cards that are deliberately **not** identical in structure — a rule
against uniform card grids. Caret (an animated caret easing between positions),
sound and effects (spark particles), autocorrect (`teh` → `the`, the red
accent's final appearance).

### 10–11 Trust and plans

Trust: large display line, mono sub-facts. Plans: Free / bring your own key as
two hairline columns, both `$0`. Then a quiet GitHub band — "Read the code that
runs in your browser."

### 12 Finale

Hand-authored pixel art as inline SVG with `shape-rendering: crispEdges`, in
three parallax layers: back wall with a window and stars, mid desk with lamp and
a figure typing, front ground plane in a warm brown continuous with cream. The
lamp pulses, the figure's hands run a 2-frame loop, stars twinkle. The CTA sits
above; the footer sits on the ground plane.

Art is authored as string maps with a palette, compiled to run-merged `<rect>`
elements — maintainable, and far fewer nodes than one rect per pixel.

## Files

```
app/src/landing/
  Landing.tsx          route composition, lazy below-fold chunk
  Privacy.tsx          rebuilt on the new system, content preserved verbatim
  copy.ts              every marketing string
  landing.css          @theme tokens, utilities, keyframes
  primitives/
    Pin.tsx            sticky pin + scroll progress + reduced-motion collapse
    PinContext.tsx     tracks whether any pin is engaged (the nav reads it)
    TextureButton.tsx  button variants
    Keycap.tsx         warm-shadow keycap with press state
    AmbientKeys.tsx    drifting background key field
  visuals/
    HeroMarquees.tsx   the two curved SVG text paths
    TypingCapsule.tsx  the hero capsule
    EditorMock.tsx     shared editor frame used by several sections
    PixelScene.tsx     the finale art
  sections/            Nav Hero MetaStrip GhostDemo TwoUp Manifesto
                       ThreeKeys Themes ThreeUp Trust Plans Finale
```

`Privacy.tsx` is rebuilt rather than dropped: it is legally load-bearing and the
e2e suite asserts its training-data disclosure.

## Non-goals

- No TipTap on the landing route. Demos are scripted; the editor loads only at
  `/app`. This is a deliberate reversal of the previous implementation and is
  what brings the route's JS budget down.
- No new dependencies. No GSAP, no Lenis, no scroll-jacking library.
- No accounts, pricing, or payment UI beyond stating that both tiers are $0.

## Verification

- Budget: **measured at ~120KB JS + ~9KB CSS gzipped ≈ 128KB**, against the
  existing 150KB budget. The pre-build estimate in this spec was 75KB and was
  wrong: it under-counted motion's renderer chunk, which alone is ~44KB
  gzipped. Under budget, but by less than planned. Recorded here rather than
  quietly corrected, because the 75KB figure was used to justify dropping the
  live editor embed and that trade should be re-read against the real number.
- `npx tsc --noEmit` clean.
- `app/e2e/landing.spec.ts` selectors rewritten against the new markup and
  passing: hero renders, CTA reaches `/app` and mounts the editor, `/privacy`
  carries the training-data disclosure.
- Visual inspection at mobile / tablet / desktop, section by section, plus a
  reduced-motion pass.
