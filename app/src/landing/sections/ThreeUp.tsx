import { FEATURES } from '../copy'

/*
 * Three feature cards that are deliberately not the same card three times.
 *
 * A row of identically-sized icon-heading-paragraph boxes is the single most
 * recognisable AI layout there is, so these differ in span, in internal
 * composition, and in whether they move at all: a wide one and a narrow one on
 * top, a full-width horizontal one beneath. Two animate, one is still, because
 * a page where every panel is doing something has no emphasis left to spend.
 */

/* The caret is the product's signature. Here it is on its own, gliding a line
   the way it does in the editor rather than jumping between characters. */
function CaretVisual() {
  return (
    <div className="relative mt-7 flex flex-1 items-center overflow-hidden rounded-xl border border-hairline bg-cream px-5 py-6 font-mono text-[0.875rem]">
      <div className="relative inline-flex items-center">
        <span className="text-ink/25">the sentence keeps moving</span>
        <span
          aria-hidden
          className="l-glide absolute left-0 top-1/2 h-[1.15em] w-[2px] -translate-y-1/2 rounded-full bg-blue"
        />
      </div>
    </div>
  )
}

/* Keystroke effects: a burst that fires and settles, not a permanent shimmer. */
function SparkVisual() {
  const sparks = [
    { x: -22, y: -16, d: 0 },
    { x: -8, y: -24, d: 0.18 },
    { x: 10, y: -21, d: 0.36 },
    { x: 24, y: -11, d: 0.54 },
    { x: -18, y: 6, d: 0.72 },
    { x: 18, y: 8, d: 0.9 },
  ]
  return (
    <div className="relative mt-7 flex min-h-[124px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-cream">
      <div className="relative">
        {sparks.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            aria-hidden
            className="l-spark absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full bg-blue"
            style={
              {
                '--sx': `${s.x}px`,
                '--sy': `${s.y}px`,
                animationDelay: `${s.d}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <span className="relative block rounded-lg border border-hairline bg-sheet px-4 py-2.5 font-mono text-sm text-ink l-raise">
          type
        </span>
      </div>
    </div>
  )
}

export function ThreeUp() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-12">
        {/* wide */}
        <article className="flex flex-col rounded-3xl border border-hairline bg-sheet p-7 l-raise md:col-span-7 sm:p-8">
          <h3 className="l-display text-[clamp(1.375rem,2.1vw,1.75rem)]">
            {FEATURES.caret.title}
          </h3>
          <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/75">
            {FEATURES.caret.body}
          </p>
          <CaretVisual />
        </article>

        {/* narrow */}
        <article className="flex flex-col rounded-3xl border border-hairline bg-sheet p-7 l-raise md:col-span-5 sm:p-8">
          <h3 className="l-display text-[clamp(1.375rem,2.1vw,1.75rem)]">
            {FEATURES.feel.title}
          </h3>
          <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/75">
            {FEATURES.feel.body}
          </p>
          <SparkVisual />
        </article>

        {/* full width, horizontal, and still */}
        <article className="flex flex-col items-start gap-7 rounded-3xl border border-hairline bg-sheet p-7 l-raise md:col-span-12 md:flex-row md:items-center md:gap-12 sm:p-8">
          <div className="md:flex-1">
            <h3 className="l-display text-[clamp(1.375rem,2.1vw,1.75rem)]">
              {FEATURES.fix.title}
            </h3>
            <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/75">
              {FEATURES.fix.body}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-hairline bg-cream px-6 py-5 font-mono text-lg">
            <span className="text-meta line-through decoration-red decoration-2">teh</span>
            <span aria-hidden className="text-muted">
              →
            </span>
            <span className="text-ink">the</span>
          </div>
        </article>
      </div>
    </section>
  )
}
