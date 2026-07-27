# Landing page architecture

Routes: `/` (landing), `/privacy`, `/app` (editor). There is no router; `src/main.tsx`
switches on `location.pathname` and lazy-loads exactly one page chunk, so the landing
route never downloads TipTap and the editor never downloads the landing animations.
`vercel.json` rewrites the deep paths to `index.html`; Vite's dev/preview SPA fallback
covers local runs.

Design spec: `docs/superpowers/specs/2026-07-27-landing-redesign-design.md`.

## Two rules that hold the page together

1. **One background.** `#FDFCF0` lives on the page root and every section is
   transparent. Separation is spacing, hairlines and warm shadow, never a colour
   swap. The single exception is the filled ink-blue **card** in `TwoUp`, which
   sits on the cream rather than replacing it.
2. **No ancestor of a pinned section may set `overflow: hidden`**, or
   `position: sticky` silently stops working and the pins collapse. The hero
   clips its own marquees; nothing above it clips anything.

## Styling

Tailwind v4 via `@tailwindcss/vite`, imported **without preflight**
(`landing.css` pulls only `theme.css` + `utilities.css`): the editor already owns the
global reset in `styles/base.css`, and preflight would fight the editor chrome.
Utilities are deliberately not wrapped in a cascade layer, because `base.css` is
unlayered and unlayered author styles always beat layered ones.

Faces: Baskervville (display), Public Sans (body), JetBrains Mono (meta labels only).

**Two greys, deliberately.** `--color-muted` (#8A8A8A, 3.35:1 on cream) is reserved
for ghost text and not-yet-revealed words, which are decorative and always have an
ink counterpart on screen. `--color-meta` (#6B675C, 5.47:1) is the only grey allowed
to carry text a reader has to read. Footer text on the pixel floor is full cream,
not a transparency of it, because cream at 70% over that brown is 2.9:1.

## The `Pin` primitive

`primitives/Pin.tsx` is the single mechanism behind all three pinned sections. A tall
outer wrapper (`vh` viewports) holds a `position: sticky` child one viewport tall;
`useScroll` reports 0→1 across the wrapper and children receive it as a MotionValue.

Nothing intercepts the wheel and nothing smooth-scrolls the page, so a pin can always
be flicked past. Because every pinned frame is a pure function of scroll position
rather than of elapsed time, scrolling back **rewinds** exactly. The e2e suite asserts
that property directly.

`PinContext` tracks whether any pin is engaged; the sticky nav subscribes and retreats
(smaller, dimmed, links dropped) so it stops competing with a section that is
deliberately holding the screen for several viewports.

## Animation approach

Rule of thumb: **CSS keyframes and SMIL for anything that loops, `motion` only for
things driven by scroll position.** There is no uniform fade-and-rise reveal wrapper;
motion is authored per section and several sections have no entrance motion at all.

- **Hero headline:** the second half renders muted and transitions to ink once,
  900ms after paint. It fires once and never loops.
- **Typing capsule:** a bar field marquees on a transform-only CSS animation. A split
  at 62% is a `clip-path: inset()` on a stationary overlay, so the caret stays fixed
  in screen space while bars flow through it. On accept the clip opens to full width.
- **Curved marquees:** two SVG text paths scrolled by SMIL `<animate>` on the text
  element's `x`. The text is rendered twice and travels exactly one measured copy
  width (`getComputedTextLength`, re-measured after `document.fonts.ready`), which is
  what makes the loop seamless. Hidden below `md`.
- **Ghost demo / themes:** scroll progress maps to a frame; state updates only when
  the frame actually changes.
- **Manifesto:** per-word opacity ramps. **The input range of every `useTransform`
  driven by `useScroll` must stay inside [0,1] and strictly increase** — motion
  compiles these into scroll-linked WAAPI animations where the input range becomes
  keyframe offsets, and an out-of-range value throws on mount and takes the whole
  React tree down.
- **Pixel scene:** string art maps compiled to run-merged `<rect>` runs, three
  parallax layers. The world is 320×96 units with the floor at y=70; every object is
  placed at `y = FLOOR - height`. It crops (narrower viewBox) rather than scales on
  small screens.

`prefers-reduced-motion` is a first-class path, not a switch: pins lose their extra
height and render finished frames, marquees drop their SMIL nodes, loops stop, and the
manifesto renders as an ordinary sentence rather than a frozen frame of the mechanic.

## Performance

Landing route, measured from a production build (gzipped): react entry ~63KB +
motion ~44KB + Below ~7KB + Landing ~3KB + shared ~3KB ≈ **120KB JS**, plus ~9KB CSS,
so **~128KB** against the 150KB budget. TipTap is not on this route at all; the demos
are scripted and the editor loads only at `/app`.

The largest single item is motion's renderer chunk (~44KB). If the budget ever gets
tight, replacing the handful of `motion.*` components with direct MotionValue
subscriptions would remove most of it; `useScroll`/`useTransform` alone do not need
the renderer.

Below-fold sections are one lazy chunk mounted by an IntersectionObserver 900px ahead
of the viewport. The OG card is generated offline by `app/scripts/generate-og.mjs`.

## Tests

`app/e2e/landing.spec.ts` (Playwright): hero renders and the CTA reaches `/app` and
mounts the editor; the ghost demo advances **and rewinds** with scroll; the themes
section cycles the real `BUILTIN_THEMES`; no horizontal overflow at 390/768/1440;
reduced motion releases the pins and still states the manifesto; `/privacy` carries
the training-data disclosure. `npx playwright test` builds and serves `dist` via
`vite preview` automatically.
