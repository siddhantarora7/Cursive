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

/*
 * The caret is the product's signature: it travels the line instead of
 * teleporting, and the ink follows it in.
 *
 * The wrapper is `leading-none` and `inline-block` so its box is the text box
 * itself. That is what keeps the caret on the baseline: previously the caret
 * was centred against a flex line box taller than the glyphs and sat visibly
 * above them, and the glide keyframe's own Y translation made it impossible to
 * correct with an alignment utility.
 */
function CaretVisual() {
  return (
    <div className="relative mt-7 flex flex-1 items-center overflow-hidden rounded-xl border border-hairline bg-cream px-5 py-6 font-mono text-[0.875rem]">
      <span className="relative inline-block whitespace-nowrap leading-none">
        {/* the sentence as it would sit unaccepted */}
        <span className="text-muted">the sentence keeps moving</span>
        {/* the same words in ink, wiped in behind the travelling caret */}
        <span
          aria-hidden
          className="l-wipe absolute inset-0 text-ink"
          style={{ clipPath: 'inset(0 100% 0 0)' }}
        >
          the sentence keeps moving
        </span>
        <span
          aria-hidden
          className="l-glide absolute left-0 top-0 h-full w-[2px] rounded-full bg-blue"
          style={{ boxShadow: '0 0 8px rgba(43,58,103,0.45)' }}
        />
      </span>
    </div>
  )
}

/*
 * Keystroke effects, shown on actual keys.
 *
 * The previous version was a single button reading "type", which illustrated
 * nothing: a label naming the thing instead of the thing happening. This is a
 * real word being typed. Keys depress left to right, each throws a small spark
 * burst as it lands, and the streak badge pays off once the row completes,
 * which is the three behaviours the copy actually claims.
 */
const KEYS = ['w', 'r', 'i', 't', 'e']
const BURST = [
  { x: -13, y: -15 },
  { x: 0, y: -19 },
  { x: 13, y: -14 },
]

function SparkVisual() {
  return (
    <div className="relative mt-7 flex min-h-[124px] flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-xl border border-hairline bg-cream py-6">
      <div className="flex items-end gap-1.5">
        {KEYS.map((k, i) => (
          <span key={k} className="relative block" style={{ '--i': i } as React.CSSProperties}>
            {BURST.map((b, j) => (
              <span
                key={j}
                aria-hidden
                className="l-spark absolute left-1/2 top-1/2 block h-1 w-1 rounded-full bg-blue"
                style={
                  {
                    '--sx': `${b.x}px`,
                    '--sy': `${b.y}px`,
                    animationDuration: '3s',
                    animationDelay: `${i * 0.15}s`,
                  } as React.CSSProperties
                }
              />
            ))}
            <span
              className="l-keytap l-keycap relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e2d0] font-mono text-sm text-ink"
              style={{ '--i': i } as React.CSSProperties}
            >
              {k}
            </span>
          </span>
        ))}
      </div>

      <span className="l-streak inline-flex items-center gap-1.5 rounded-full border border-[rgb(201_162_39/0.35)] bg-[rgb(201_162_39/0.1)] px-3 py-1">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#c9a227]" />
        <span className="l-meta text-ink">12 in a row</span>
      </span>
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
            <span className="text-meta line-through decoration-red decoration-2">‘teh’</span>
            <span aria-hidden className="text-muted">
              →
            </span>
            <span className="text-ink">‘the’</span>
          </div>
        </article>
      </div>
    </section>
  )
}
