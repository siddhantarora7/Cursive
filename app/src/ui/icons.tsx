/** Inline 16×16 stroke icons — one visual family, currentColor throughout. */

const PATHS: Record<string, string> = {
  undo: 'M3 7h7a4 4 0 0 1 0 8H6M3 7l3-3M3 7l3 3',
  redo: 'M13 7H6a4 4 0 0 0 0 8h4m3-8-3-3m3 3-3 3',
  bold: 'M5 3h4.5a2.5 2.5 0 0 1 0 5H5zm0 5h5a2.5 2.5 0 0 1 0 5H5z',
  italic: 'M9.5 3h3M3.5 13h3M11 3 5 13',
  underline: 'M4.5 3v5a3.5 3.5 0 0 0 7 0V3M4 13.5h8',
  strike: 'M3 8h10M11 4.5C10.5 3.6 9.4 3 8 3 6 3 5 4 5 5.2c0 .8.4 1.4 1.2 1.8M5 11.5c.5.9 1.6 1.5 3 1.5 2 0 3-1 3-2.2 0-.6-.2-1.1-.7-1.5',
  h1: 'M2.5 4v8m0-4h5m0-4v8M11 6.5 12.7 5v7',
  quote: 'M4 5c-1 .8-1.6 2-1.6 3.4 0 1.5.9 2.6 2.1 2.6 1 0 1.8-.8 1.8-1.9 0-1-.7-1.8-1.7-1.8-.2 0-.4 0-.5.1C4.3 6.5 4.8 5.7 5.6 5zm6 0c-1 .8-1.6 2-1.6 3.4 0 1.5.9 2.6 2.1 2.6 1 0 1.8-.8 1.8-1.9 0-1-.7-1.8-1.7-1.8-.2 0-.4 0-.5.1.2-.9.7-1.7 1.5-2.4z',
  code: 'm5.5 5-3 3 3 3m5-6 3 3-3 3',
  alignLeft: 'M2.5 4h11m-11 3h7m-7 3h11m-11 3h7',
  alignCenter: 'M2.5 4h11m-9 3h7m-9 3h11m-9 3h7',
  alignRight: 'M2.5 4h11m-7 3h7m-11 3h11m-7 3h7',
  alignJustify: 'M2.5 4h11m-11 3h11m-11 3h11m-11 3h11',
  listBullet: 'M6 4.5h7.5M6 8h7.5M6 11.5h7.5M3 4.5h.01M3 8h.01M3 11.5h.01',
  listOrdered: 'M6.5 4.5H14M6.5 8H14M6.5 11.5H14M2.2 3.5 3.4 3v3M2.2 9.6c.2-.4.6-.6 1-.6.6 0 1 .4 1 .9 0 .8-2 1.2-2 2.1h2.3',
  listCheck: 'M7 4.5h6.5M7 8h6.5M7 11.5h6.5M2 4.7l1 1 1.8-2M2 8.2l1 1 1.8-2M2 11.7l1 1 1.8-2',
  link: 'M6.5 9.5a3 3 0 0 0 4.2.3l1.8-1.6a3 3 0 0 0-4-4.4l-1 .9m2 1.8a3 3 0 0 0-4.2-.3L3.5 7.8a3 3 0 0 0 4 4.4l1-.9',
  sub: 'M2.5 4l5 6m0-6-5 6M12.7 13.5h-2.5c0-1.4 2.4-1.8 2.4-3 0-.6-.5-1-1.2-1-.5 0-1 .2-1.2.7',
  sup: 'M2.5 6l5 6m0-6-5 6M12.7 6.5h-2.5c0-1.4 2.4-1.8 2.4-3 0-.6-.5-1-1.2-1-.5 0-1 .2-1.2.7',
  highlight: 'm4 10.5 6.5-6.5a1.4 1.4 0 0 1 2 2L6 12.5l-3 1z m6-6 2 2',
  textColor: 'M4.5 11 8 3l3.5 8m-6-2.5h5M3 14h10',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zm7 2-3.5-3.5',
  download: 'M8 2.5V10m0 0 3-3m-3 3-3-3M3 13.5h10',
  copy: 'M6 6.5A1.5 1.5 0 0 1 7.5 5h4A1.5 1.5 0 0 1 13 6.5v5a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 6 11.5zM10 5V4.5A1.5 1.5 0 0 0 8.5 3h-4A1.5 1.5 0 0 0 3 4.5v5A1.5 1.5 0 0 0 4.5 11H6',
  zen: 'M8 3C4.5 3 2.2 6 1.5 8c.7 2 3 5 6.5 5s5.8-3 6.5-5c-.7-2-3-5-6.5-5zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  gear: 'M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm5.5-2.5a5.5 5.5 0 0 1-.1 1l1.4 1.1-1.3 2.2-1.7-.6a5.6 5.6 0 0 1-1.7 1l-.3 1.8H6.2l-.3-1.8a5.6 5.6 0 0 1-1.7-1l-1.7.6-1.3-2.2L2.6 9a5.5 5.5 0 0 1 0-2L1.2 5.9l1.3-2.2 1.7.6a5.6 5.6 0 0 1 1.7-1l.3-1.8h3.6l.3 1.8a5.6 5.6 0 0 1 1.7 1l1.7-.6 1.3 2.2L13.4 7c.1.3.1.7.1 1z',
  file: 'M4 2h5l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm5 0v4h4',
  plus: 'M8 3v10M3 8h10',
  trash: 'M3 4.5h10m-8.5 0V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5m-5.5 0V3h4v1.5M6.5 7v4.5m3-4.5v4.5',
  close: 'm4 4 8 8m0-8-8 8',
  chevron: 'm4.5 6.5 3.5 3.5 3.5-3.5',
  check: 'm3 8.5 3.2 3L13 5',
  sparkle: 'M8 2.5 9.3 6 13 7.5 9.3 9 8 12.5 6.7 9 3 7.5 6.7 6zM13 2l.5 1.3L15 4l-1.5.7L13 6l-.5-1.3L11 4l1.5-.7z',
  spacing: 'M8.5 4h5m-5 4h5m-5 4h5M3.5 3v10m0-10L2 4.5M3.5 3 5 4.5m-1.5 8.5L2 11.5m1.5 1.5L5 11.5',
}

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  const d = PATHS[name]
  const filled = name === 'quote' || name === 'gear' || name === 'zen' || name === 'sparkle'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} fillRule={filled ? 'evenodd' : undefined} />
    </svg>
  )
}
