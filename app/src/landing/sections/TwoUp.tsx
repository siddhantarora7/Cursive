import { TWO_UP } from '../copy'
import { Keycap } from '../primitives/Keycap'

/*
 * The one place on the page where a surface is not cream.
 *
 * The rule for this document is a single background with no colour change
 * between sections; separation comes from spacing, hairlines and warm shadow.
 * The filled card is a deliberate exception and is scoped to a card, not to a
 * section, so the field behind it never changes. It buys the page one moment
 * of saturation, which is the whole reason the ink-blue exists.
 *
 * The chip embedded mid-heading is the move worth borrowing from the
 * reference: it puts the mechanism inside the sentence describing it.
 */

function Chip({ children, tone }: { children: React.ReactNode; tone: 'light' | 'dark' }) {
  return (
    <span
      className={`mx-0.5 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 align-middle font-body text-[0.72em] font-medium ${
        tone === 'dark'
          ? 'bg-cream/15 text-cream ring-1 ring-inset ring-cream/25'
          : 'bg-blue/8 text-blue ring-1 ring-inset ring-blue/15'
      }`}
    >
      {children}
    </span>
  )
}

export function TwoUp() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
        {/* ------------------------------------------------- ghost text --- */}
        <article className="l-glass-dark flex flex-col rounded-3xl p-7 text-cream sm:p-9">
          <h3 className="l-display text-[clamp(1.5rem,2.4vw,2rem)] text-cream">
            {TWO_UP.draft.before}
            <Chip tone="dark">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-cream/60" />
              {TWO_UP.draft.chip}
            </Chip>
            {TWO_UP.draft.after}
          </h3>
          <p className="l-prose mt-4 text-[0.9375rem] leading-relaxed text-cream/75">
            {TWO_UP.draft.body}
          </p>

          <div className="mt-8 rounded-2xl bg-[rgb(16_24_48/0.5)] p-5 font-mono text-[0.875rem] leading-[1.9] shadow-[inset_0_1px_0_rgb(253_252_240/0.12),inset_0_-1px_0_rgb(0_0_0/0.3)] ring-1 ring-inset ring-cream/12">
            <span className="text-cream">The deadline moved to Friday, which means </span>
            <span className="text-cream/40">we lose the buffer we planned for.</span>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="rounded-md border border-cream/20 bg-cream/10 px-2 py-1 font-mono text-[0.6875rem] tracking-[0.12em] text-cream/80">
                TAB
              </span>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-cream/45">
                to accept
              </span>
            </div>
          </div>
        </article>

        {/* ------------------------------------------------------ cmd+k --- */}
        <article className="l-glass flex flex-col rounded-3xl p-7 sm:p-9">
          <h3 className="l-display text-[clamp(1.5rem,2.4vw,2rem)]">
            {TWO_UP.edit.before}
            <Chip tone="light">{TWO_UP.edit.chip}</Chip>
            {TWO_UP.edit.after}
          </h3>
          <p className="l-prose mt-4 text-[0.9375rem] leading-relaxed text-ink/75">
            {TWO_UP.edit.body}
          </p>

          <div className="mt-8 rounded-2xl border border-white/60 bg-[rgb(255_255_255/0.45)] p-5 font-mono text-[0.875rem] leading-[1.9] shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]">
            <div className="flex items-center gap-2">
              <Keycap size="sm">⌘K</Keycap>
              <span className="truncate text-ink/60">“{TWO_UP.edit.prompt}”</span>
            </div>
            <p className="mt-4 text-meta line-through decoration-red/70 decoration-2">
              {TWO_UP.edit.was}
            </p>
            <p className="mt-2 text-ink">{TWO_UP.edit.now}</p>
          </div>
        </article>
      </div>
    </section>
  )
}
