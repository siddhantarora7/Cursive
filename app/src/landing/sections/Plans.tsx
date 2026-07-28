import { CTA, PLANS, SOURCE, NAV } from '../copy'
import { TextureButton } from '../primitives/TextureButton'
import { IconCode, IconPlug, IconShield } from '../primitives/Icons'
import { RepoStats } from '../primitives/RepoStats'

/*
 * Two plans, both free, stated without a pricing table's usual theatre: no
 * "most popular" ribbon, no crossed-out anchor price, no third tier invented to
 * make the middle one look reasonable. There are genuinely two ways to use this
 * and both cost nothing.
 *
 * The buttons here are deliberately not the brand button. When they were, the
 * page had three identical glossy black calls to action competing at the same
 * weight, which is the same as having none. The featured plan gets a solid
 * secondary and the other an outline, so "start writing" stays the one thing
 * on the page that looks like the thing to do.
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
  readonly priceNote: string
}

function Plan({
  plan,
  featured,
  icon,
}: {
  plan: PlanShape
  featured?: boolean
  icon: React.ReactNode
}) {
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-3xl p-7 sm:p-9 ${
        featured ? 'l-glass' : 'border border-hairline bg-[rgb(255_255_255/0.28)]'
      }`}
    >
      {/* A gold wash across the top of the featured card, so the two are
          distinguishable without a badge shouting "most popular". */}
      {featured && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background:
              'radial-gradient(120% 100% at 50% 0%, rgba(232,201,95,0.22), rgba(201,162,39,0.06) 46%, rgba(201,162,39,0) 100%)',
          }}
        />
      )}

      <div className="relative flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            featured
              ? 'bg-[rgb(201_162_39/0.16)] text-[#8a6f1c]'
              : 'bg-[rgb(43_58_103/0.08)] text-blue'
          }`}
        >
          {icon}
        </span>
        <h3 className="l-display text-2xl">{plan.name}</h3>
      </div>

      <p className="relative mt-5 flex items-baseline gap-2">
        <span className="font-display text-5xl leading-none text-ink tabular-nums">
          {plan.price}
        </span>
        <span className="l-meta text-meta">{plan.priceNote}</span>
      </p>

      <p className="relative mt-4 text-[0.9375rem] leading-relaxed text-ink/70">{plan.blurb}</p>

      <ul className="relative mt-7 flex flex-1 list-none flex-col gap-3.5">
        {plan.points.map((p) => (
          <li key={p} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink/80">
            <span
              aria-hidden
              className={`mt-[0.3em] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                featured ? 'bg-[rgb(201_162_39/0.22)]' : 'bg-[rgb(43_58_103/0.1)]'
              }`}
            >
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                <path
                  d="m2.5 6.2 2.2 2.2 4.8-4.8"
                  fill="none"
                  stroke={featured ? '#8a6f1c' : '#2B3A67'}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {p}
          </li>
        ))}
      </ul>

      <TextureButton
        href={CTA.href}
        variant={featured ? 'secondary' : 'outline'}
        className="relative mt-8 w-full"
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
          <Plan plan={PLANS.free} featured icon={<IconShield />} />
          <Plan plan={PLANS.byok} icon={<IconPlug />} />
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[0.9375rem] leading-relaxed text-ink/75">
          {PLANS.noPaid}
        </p>
        <p className="l-prose mx-auto mt-5 text-center text-sm leading-relaxed text-meta">
          {PLANS.note}
        </p>
      </div>

      {/* Backs the privacy claim with something checkable. */}
      <div className="mx-auto mt-20 max-w-4xl border-t border-hairline pt-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="l-display flex items-center gap-3 text-[clamp(1.375rem,2.4vw,1.875rem)]">
              <span className="text-blue">
                <IconCode />
              </span>
              {SOURCE.heading}
            </h3>
            <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/70">
              {SOURCE.body}
            </p>
            <p className="mt-4">
              <RepoStats repo="siddhantarora7/Cursive" />
            </p>
          </div>
          <TextureButton href={NAV.repo} variant="outline" className="shrink-0">
            {SOURCE.cta}
          </TextureButton>
        </div>
      </div>
    </section>
  )
}
