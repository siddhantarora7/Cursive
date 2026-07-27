/*
 * The drifting keycap field that runs behind the middle of the page.
 *
 * Deliberately near-invisible. The brief calls for atmosphere, and atmosphere
 * that you consciously notice has stopped being atmosphere and started being
 * clutter. The field rises to legible strength exactly once, behind the "entire
 * interface" section, so the motif pays off instead of staying wallpaper.
 *
 * Motion is transform-only on long, mutually-offset loops so the field never
 * appears to pulse in unison, and it is `pointer-events: none` throughout.
 */

type Key = {
  glyph: string
  /** Percentages, so the field composes rather than shrinks on small screens. */
  x: number
  y: number
  size: number
  rotate: number
  dx: number
  dy: number
  dur: number
  delay: number
}

const KEYS: Key[] = [
  { glyph: '⌘', x: 8, y: 12, size: 74, rotate: -14, dx: 14, dy: -18, dur: 26, delay: 0 },
  { glyph: '⏎', x: 88, y: 20, size: 62, rotate: 11, dx: -12, dy: 16, dur: 31, delay: -6 },
  { glyph: '⇧', x: 78, y: 68, size: 52, rotate: -7, dx: 16, dy: 12, dur: 24, delay: -12 },
  { glyph: '⌥', x: 16, y: 74, size: 58, rotate: 17, dx: -10, dy: -14, dur: 29, delay: -3 },
  { glyph: '⌫', x: 46, y: 8, size: 46, rotate: 6, dx: 12, dy: 14, dur: 34, delay: -18 },
  { glyph: '⌃', x: 4, y: 44, size: 42, rotate: -20, dx: 10, dy: 18, dur: 27, delay: -9 },
  { glyph: '⇥', x: 94, y: 48, size: 50, rotate: 9, dx: -14, dy: -10, dur: 22, delay: -15 },
  { glyph: '⎋', x: 60, y: 84, size: 44, rotate: -11, dx: 8, dy: -16, dur: 33, delay: -21 },
]

export function AmbientKeys({ opacity = 0.4 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 'var(--z-ambient)', opacity }}
    >
      {KEYS.map((k) => (
        <span
          key={k.glyph}
          className="l-drifter absolute block"
          style={
            {
              left: `${k.x}%`,
              top: `${k.y}%`,
              '--r': `${k.rotate}deg`,
              '--dx': `${k.dx}px`,
              '--dy': `${k.dy}px`,
              '--dur': `${k.dur}s`,
              '--delay': `${k.delay}s`,
            } as React.CSSProperties
          }
        >
          <span
            className="l-keycap flex items-center justify-center border border-[#efebda] font-mono text-muted"
            style={{
              width: k.size,
              height: k.size,
              borderRadius: k.size * 0.24,
              fontSize: k.size * 0.34,
            }}
          >
            {k.glyph}
          </span>
        </span>
      ))}
    </div>
  )
}
