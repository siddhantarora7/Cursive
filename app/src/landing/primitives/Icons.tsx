/*
 * Inline icons, drawn to this page's stroke weight.
 *
 * No icon dependency: the set needed here is small and specific (a database, a
 * plug, a keyboard), and pulling a whole icon library for nine glyphs would
 * cost more than the rest of the landing route's own code. Every glyph is on a
 * 24-unit grid with a 1.6 stroke so they sit consistently next to 11px mono
 * labels, and they inherit `currentColor`.
 */

type IconProps = { className?: string }

const base = (className = '') => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: `h-[1.05em] w-[1.05em] shrink-0 ${className}`,
  'aria-hidden': true,
})

export const IconDatabase = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
    <path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </svg>
)

export const IconNoAccount = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5 1.2 0 2.3.2 3.3.6" />
    <path d="m17 17 4 4m0-4-4 4" />
  </svg>
)

export const IconNoSync = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M20 11a8 8 0 0 0-13.3-5.3L4 8" />
    <path d="M4 13a8 8 0 0 0 13.3 5.3L20 16" />
    <path d="M4 4v4h4M20 20v-4h-4" />
    <path d="m3 3 18 18" />
  </svg>
)

export const IconShield = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 3 5 6v6c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const IconOffline = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 19.5h.01" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M5 12.5a10 10 0 0 1 14 0" />
    <path d="m3 3 18 18" />
  </svg>
)

export const IconKeyboard = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17 9.5h.01M6.5 12.8h.01M10 12.8h.01M13.5 12.8h.01M17 12.8h.01M8.5 15.6h7" />
  </svg>
)

export const IconPalette = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z" />
    <circle cx="7.8" cy="11.5" r="1.1" />
    <circle cx="11" cy="7.6" r="1.1" />
    <circle cx="15.6" cy="9.4" r="1.1" />
  </svg>
)

export const IconSpark = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
    <path d="M18.5 4v2.6M17.2 5.3h2.6" />
  </svg>
)

export const IconCode = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
  </svg>
)

export const IconPlug = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M9 3v5M15 3v5" />
    <path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0V8Z" />
    <path d="M12 16.5V21" />
  </svg>
)

export const IconDownload = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
    <path d="M5 17.5v1A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-1" />
  </svg>
)

export const IconEye = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="m3 3 18 18" />
  </svg>
)
