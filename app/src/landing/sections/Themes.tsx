import { useState } from 'react'
import { useMotionValueEvent, type MotionValue } from 'motion/react'
import { BUILTIN_THEMES } from '../../themes'
import { THEMES } from '../copy'
import { Pin } from '../primitives/Pin'
import { EditorMock } from '../visuals/EditorMock'

/*
 * The themes section drives the mock with the editor's real theme objects.
 *
 * Not an approximation of the themes and not a screenshot of them: the same
 * `BUILTIN_THEMES` array the app applies at runtime, piped into the same CSS
 * custom properties the mock already reads. If a theme is retuned in
 * src/themes, this section changes with it and cannot drift out of date.
 *
 * The crossfade is a plain colour transition on the custom properties, so the
 * paper, ink, caret and border all move together over 650ms with nothing per
 * frame in JavaScript.
 */

function Cycle({ progress }: { progress: MotionValue<number> }) {
  const [index, setIndex] = useState(0)
  const themes = BUILTIN_THEMES

  useMotionValueEvent(progress, 'change', (v) => {
    const next = Math.min(
      themes.length - 1,
      Math.max(0, Math.floor(Math.min(0.9999, Math.max(0, v)) * themes.length)),
    )
    setIndex((prev) => (prev === next ? prev : next))
  })

  const theme = themes[index]
  if (!theme) return null

  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div className="text-center">
        <h2 className="l-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{THEMES.heading}</h2>
        <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{THEMES.body}</p>
      </div>

      <EditorMock
        className="mt-10 l-raise-lg"
        label="draft.md"
        status={theme.name}
        style={
          {
            '--mock-bg': theme.vars.bg,
            '--mock-ink': theme.vars.ink,
            '--mock-muted': theme.vars.muted,
            '--mock-border': theme.vars.border,
          } as React.CSSProperties
        }
      >
        <p className="transition-colors duration-[650ms]">
          {THEMES.sample}
          <span
            className="l-caret"
            aria-hidden
            style={{ background: theme.vars.caret, transition: 'background-color 650ms' }}
          />
        </p>
      </EditorMock>

      {/* Which of the eight you are looking at. Dots, not a scrollbar: this is
          orientation, not a control. */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {themes.map((t, i) => (
          <span
            key={t.id}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 20 : 6,
              background: i === index ? '#2B3A67' : '#E4E1D2',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function Themes() {
  return (
    <Pin id="themes" vh={3.6} innerClassName="pt-20">
      {(p) => <Cycle progress={p} />}
    </Pin>
  )
}
