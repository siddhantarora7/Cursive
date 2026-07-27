import type { CSSProperties, ReactNode } from 'react'

/*
 * The editor frame shared by the ghost-text, two-up and themes sections.
 *
 * Everything visual routes through CSS custom properties so the themes section
 * can drive it with the editor's real theme variables and get a genuine
 * crossfade for free, without this component knowing what a theme is.
 *
 * The body is set in the editor's actual default face (JetBrains Mono, the
 * `paper` theme's font) rather than the page's body font. It is what the
 * product really looks like, and it keeps the mock visually distinct from the
 * marketing copy wrapped around it.
 */

type Props = {
  children: ReactNode
  /** Filename shown at the top left. */
  label?: string
  /** Small right-aligned status, e.g. a word count or theme name. */
  status?: ReactNode
  className?: string
  style?: CSSProperties
  bare?: boolean
}

export function EditorMock({
  children,
  label = 'untitled.md',
  status,
  className = '',
  style,
  bare = false,
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-[650ms] ${className}`}
      style={{
        background: 'var(--mock-bg, #FFFEF8)',
        borderColor: 'var(--mock-border, #E4E1D2)',
        color: 'var(--mock-ink, #1A1A1A)',
        ...style,
      }}
    >
      {!bare && (
        <div
          className="flex items-center justify-between border-b px-4 py-2.5 transition-colors duration-[650ms]"
          style={{ borderColor: 'var(--mock-border, #E4E1D2)' }}
        >
          <span
            className="l-meta transition-colors duration-[650ms]"
            style={{ color: 'var(--mock-muted, #8A8A8A)' }}
          >
            {label}
          </span>
          {status ? (
            <span
              className="l-meta transition-colors duration-[650ms]"
              style={{ color: 'var(--mock-muted, #8A8A8A)' }}
            >
              {status}
            </span>
          ) : null}
        </div>
      )}
      <div className="px-5 py-5 font-mono text-[0.9375rem] leading-[1.85] sm:px-7 sm:py-7">
        {children}
      </div>
    </div>
  )
}
