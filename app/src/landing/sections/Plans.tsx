import { CTA, PLANS, SOURCE, NAV } from '../copy'
import { TextureButton } from '../primitives/TextureButton'

/*
 * Two plans, both free, stated without a pricing table's usual theatre: no
 * "most popular" ribbon, no crossed-out anchor price, no third tier invented
 * to make the middle one look reasonable. There are genuinely two ways to use
 * this and both cost nothing.
 *
 * The note underneath is the uncomfortable one, and it stays. Free-tier text
 * goes to providers who may train on it. Someone deciding what to paste into
 * this editor needs that before they start, not buried in a privacy page.
 */

type PlanShape = {
  readonly name: string
  readonly price: string
  readonly blurb: string
  readonly points: readonly string[]
  readonly cta: string
}

function Plan({ plan, featured }: { plan: PlanShape; featured?: boolean }) {
  return (
    <article
      className={`flex flex-col rounded-3xl p-7 sm:p-9 ${
        featured
          ? 'border border-hairline bg-sheet l-raise'
          : 'border border-hairline bg-transparent'
      }`}
    >
      <h3 className="l-display text-2xl">{plan.name}</h3>
      <p className="mt-1 font-display text-4xl text-ink tabular-nums">{plan.price}</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/70">{plan.blurb}</p>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {plan.points.map((p) => (
          <li key={p} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink/80">
            <span aria-hidden className="mt-[0.55em] block h-1 w-1 shrink-0 rounded-full bg-blue" />
            {p}
          </li>
        ))}
      </ul>

      <TextureButton
        href={CTA.href}
        variant={featured ? 'primary' : 'secondary'}
        className="mt-8 w-full"
      >
        {plan.cta}
      </TextureButton>
    </article>
  )
}

export function Plans() {
  return (
    <section id="plans" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="l-display text-center text-[clamp(1.75rem,3.4vw,2.75rem)]">
          {PLANS.heading}
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Plan plan={PLANS.free} featured />
          <Plan plan={PLANS.byok} />
        </div>

        <p className="l-prose mx-auto mt-8 text-center text-sm leading-relaxed text-meta">
          {PLANS.note}
        </p>
      </div>

      {/* Backs the privacy claim with something checkable. */}
      <div className="mx-auto mt-20 max-w-4xl border-t border-hairline pt-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="l-display text-[clamp(1.375rem,2.4vw,1.875rem)]">{SOURCE.heading}</h3>
            <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/70">
              {SOURCE.body}
            </p>
          </div>
          <TextureButton href={NAV.repo} variant="secondary" className="shrink-0">
            {SOURCE.cta}
          </TextureButton>
        </div>
      </div>
    </section>
  )
}
