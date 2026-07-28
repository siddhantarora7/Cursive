import type { ReactNode } from 'react'
import { TRUST } from '../copy'
import { LogoLoop, type LoopItem } from '../primitives/LogoLoop'
import {
  IconCode,
  IconDatabase,
  IconDownload,
  IconEye,
  IconKeyboard,
  IconNoAccount,
  IconNoSync,
  IconOffline,
  IconPalette,
  IconPlug,
  IconShield,
  IconSpark,
} from '../primitives/Icons'

/*
 * The privacy claim, stated plainly, then a belt of everything that is true.
 *
 * The four static pills that used to sit here were the whole list, which made
 * the section look like it was reaching. A slow marquee carries three times as
 * many facts in less vertical space, and the movement is what reads as "there
 * is more of this" rather than "here are four things".
 *
 * Every pill is checkable against the repo. None is a partner logo, a customer
 * count, or a press mention, because there aren't any, and inventing them is
 * the oldest trick on a landing page.
 */

const ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  database: IconDatabase,
  noAccount: IconNoAccount,
  noSync: IconNoSync,
  shield: IconShield,
  eye: IconEye,
  offline: IconOffline,
  keyboard: IconKeyboard,
  palette: IconPalette,
  spark: IconSpark,
  plug: IconPlug,
  download: IconDownload,
  code: IconCode,
}

const ITEMS: LoopItem[] = TRUST.facts.map((f) => {
  const Icon = ICONS[f.icon] ?? IconShield
  return {
    label: f.label,
    node: (
      <span className="l-glass inline-flex items-center gap-2 rounded-full px-4 py-2">
        <span className="text-blue">
          <Icon />
        </span>
        <span className="l-meta whitespace-nowrap text-ink">{f.label}</span>
      </span>
    ),
  }
})

export function Trust() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="l-display text-[clamp(2rem,4.5vw,3.5rem)]">{TRUST.heading}</h2>
        <p className="l-prose mx-auto mt-6 text-[1.0625rem] text-ink/80">{TRUST.body}</p>
      </div>

      {/* Full bleed: the belt has to run off both edges, or it reads as a
          fixed-width row that happens to be moving. */}
      <div className="mt-12">
        <LogoLoop
          items={ITEMS}
          speed={38}
          gap={14}
          ariaLabel="What is true about Cursive"
          renderItem={(item) => item.node}
        />
      </div>

      <p className="mt-12 text-center">
        <a
          href={TRUST.link.href}
          className="font-body text-[0.9375rem] text-blue underline decoration-blue/25 underline-offset-4 transition-colors hover:decoration-blue"
        >
          {TRUST.link.label}
        </a>
      </p>
    </section>
  )
}
