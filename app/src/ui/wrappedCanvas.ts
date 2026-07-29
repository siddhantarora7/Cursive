import type { MonthlyReport } from '../core/stats/report'

/**
 * The shareable artefact: a 1080×1350 card drawn from the report.
 *
 * Colours are read from the live theme's CSS variables, so the image a writer
 * saves matches the app they wrote in. Drawn on demand into a detached canvas —
 * nothing here runs while typing.
 */

const W = 1080
const H = 1350

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`
}

export function renderWrappedPng(report: MonthlyReport, monthLabel: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bg = cssVar('--bg', '#fbfaf7')
  const ink = cssVar('--ink', '#16181c')
  const muted = cssVar('--muted', '#6b7280')
  const accent = cssVar('--accent', '#3fbfb0')
  const font = cssVar('--font-editor', 'Georgia, serif')

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // accent rule at the top — the caret colour is the brand
  ctx.fillStyle = accent
  ctx.fillRect(88, 96, 120, 8)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = muted
  ctx.font = `500 30px ${font}`
  ctx.fillText(monthLabel.toUpperCase(), 88, 176)

  ctx.fillStyle = ink
  ctx.font = `700 84px ${font}`
  ctx.fillText(report.persona.title, 88, 282)

  ctx.fillStyle = muted
  ctx.font = `italic 34px ${font}`
  wrapText(ctx, report.persona.blurb, 88, 340, W - 176, 46)

  /* ---- the numbers ---- */
  const stats: Array<[string, string]> = [
    [report.words.toLocaleString(), 'words'],
    [String(report.daysWritten), report.daysWritten === 1 ? 'day' : 'days'],
    [String(report.longestStreak), 'day streak'],
    [report.bestHour === null ? '—' : hourLabel(report.bestHour), 'best hour'],
    [formatMinutes(report.activeMinutes), 'at the keys'],
    [report.ghost.rate === null ? '—' : `${Math.round(report.ghost.rate * 100)}%`, 'ghost taken'],
  ]

  let y = 500
  for (let i = 0; i < stats.length; i += 2) {
    for (let col = 0; col < 2 && i + col < stats.length; col++) {
      const [value, label] = stats[i + col]!
      const x = 88 + col * 470
      ctx.fillStyle = ink
      ctx.font = `700 76px ${font}`
      ctx.fillText(value, x, y)
      ctx.fillStyle = muted
      ctx.font = `400 30px ${font}`
      ctx.fillText(label, x, y + 44)
    }
    y += 160
  }

  /* ---- vocabulary ---- */
  if (report.topWords.length > 0) {
    ctx.fillStyle = muted
    ctx.font = `500 28px ${font}`
    ctx.fillText('WORDS YOU REACHED FOR', 88, y + 24)

    const top = report.topWords.slice(0, 6)
    const max = top[0]!.count
    let wy = y + 84
    for (const w of top) {
      const barW = Math.max(8, Math.round((w.count / max) * 520))
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.22
      ctx.fillRect(88, wy - 30, barW, 40)
      ctx.globalAlpha = 1
      ctx.fillStyle = ink
      ctx.font = `500 34px ${font}`
      ctx.fillText(w.word, 100, wy)
      ctx.fillStyle = muted
      ctx.font = `400 28px ${font}`
      ctx.fillText(String(w.count), 640, wy)
      wy += 56
    }
  }

  /* ---- footer ---- */
  ctx.fillStyle = muted
  ctx.font = `400 26px ${font}`
  ctx.fillText('Written in Cursive · computed on this device', 88, H - 88)

  return canvas.toDataURL('image/png')
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`
  return `${Math.floor(total / 60)}h ${total % 60}m`
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y)
}
