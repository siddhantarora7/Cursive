import { CTA, FINALE, FOOTER } from '../copy'
import { TextureButton } from '../primitives/TextureButton'
import { PixelScene } from '../visuals/PixelScene'

/*
 * The page ends by landing on something solid.
 *
 * The scene is the only depiction of a person on the site and it is the last
 * thing you see: someone at a desk, at night, writing. The footer sits on the
 * ground plane rather than below it, so the page finishes on the floor of the
 * room instead of trailing off into another band of cream.
 *
 * The section background stays cream like every other section. The brown is
 * the floor of a drawn scene, not a colour change in the document.
 */

export function Finale() {
  return (
    <section className="relative">
      <div className="px-6 pb-16 pt-20 text-center sm:pb-20 sm:pt-28">
        <h2 className="l-display text-[clamp(2.5rem,6vw,4.5rem)]">{FINALE.heading}</h2>
        <p className="l-prose mx-auto mt-5 text-[1.0625rem] text-ink/80">{FINALE.sub}</p>
        <div className="mt-9 flex flex-col items-center gap-4">
          <TextureButton href={CTA.href} size="lg">
            {CTA.label}
          </TextureButton>
          <p className="l-meta text-meta">{FINALE.meta}</p>
        </div>
      </div>

      <PixelScene />

      {/*
       * Sits on the floor of the scene.
       *
       * Text is full cream, not a transparency of it. Cream at 70% over this
       * brown lands at 2.9:1, which fails outright at this size; full cream is
       * 4.7:1. Hover is carried by the underline instead of by brightness,
       * since there is no brightness left to spend.
       */}
      <footer className="bg-[#8C6B4A] px-6 pb-9 pt-2">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="l-meta text-cream">{FOOTER.line}</p>
          <nav aria-label="Footer" className="flex items-center gap-6">
            {[
              { href: FOOTER.privacy, label: 'Privacy' },
              { href: FOOTER.repo, label: 'GitHub' },
              { href: CTA.href, label: 'Open the editor' },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="l-meta text-cream no-underline underline-offset-4 transition-[text-decoration-color] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </section>
  )
}
