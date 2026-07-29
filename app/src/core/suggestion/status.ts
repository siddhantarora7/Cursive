/**
 * Why suggestions are quiet right now — and what to say about it.
 *
 * These are three different facts that used to degrade identically:
 *   exhausted   — you spent today's free allowance. Comes back on a clock.
 *   rate-limited— you (or your IP) went too fast. Comes back in seconds.
 *   unreachable — the model never answered. Not your fault, not a quota.
 *
 * A user who cannot tell these apart concludes "the AI is bad", and that
 * conclusion is permanent. So the distinction is modelled here, in pure code,
 * with the copy attached — the wording is testable rather than buried in JSX.
 */

/** Where completions are coming from. Mirrors the free/byok halves of AiMode. */
export type AiSource = 'free' | 'byok'

export type SuggestionStatus =
  | { kind: 'ready' }
  /** AI switched off in settings, or BYOK selected with no key entered */
  | { kind: 'off' }
  /** daily free allowance spent; `resumeAt` is a wall-clock ms timestamp */
  | { kind: 'exhausted'; resumeAt: number }
  /** too many requests too fast; transient */
  | { kind: 'rate-limited'; retryAt: number }
  /** every provider errored, or the network is down */
  | { kind: 'unreachable'; retryAt: number }
  /** server-side kill switch */
  | { kind: 'disabled' }

export interface StatusDescription {
  text: string
  /** the remedy, when there is one worth offering */
  cta: { label: string; target: 'byok' } | null
  /** `quiet` = transient and self-healing; `notice` = the user should act */
  tone: 'quiet' | 'notice'
}

/**
 * Humanise a wait. Deliberately coarse: a countdown that ticks would pull the
 * eye away from the text, which is the one thing this app protects.
 */
export function formatResumeIn(ms: number): string {
  if (ms <= 0) return 'now'
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return 'in a moment'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.round(ms / 3_600_000)
  return hours === 1 ? 'in about an hour' : `in ${hours}h`
}

/**
 * The one place suggestion downtime turns into words.
 * Returns null when there is nothing to say — `ready` and `off` are not
 * failures and must not occupy the status strip.
 */
export function describeStatus(
  status: SuggestionStatus,
  now: number,
  source: AiSource,
): StatusDescription | null {
  switch (status.kind) {
    case 'ready':
    case 'off':
      return null

    case 'exhausted':
      // BYOK skips caps entirely, so this can only be the free tier.
      return {
        text: `free suggestions are used up for today — back ${formatResumeIn(status.resumeAt - now)}`,
        cta: { label: 'use your own key', target: 'byok' },
        tone: 'notice',
      }

    case 'disabled':
      return {
        text: 'suggestions are switched off on our end right now',
        cta: { label: 'use your own key', target: 'byok' },
        tone: 'notice',
      }

    case 'rate-limited':
      return {
        text:
          source === 'byok'
            ? 'your provider is rate-limiting — suggestions resume shortly'
            : 'a bit fast — suggestions resume shortly',
        cta: null,
        tone: 'quiet',
      }

    case 'unreachable':
      // For BYOK this is usually a bad key or a dead endpoint: worth a look.
      // On the free tier it is our problem and it retries itself, so we say so
      // plainly and offer nothing — a CTA here would blame the user for our outage.
      return source === 'byok'
        ? {
            text: "can't reach your provider — check your key",
            cta: { label: 'open settings', target: 'byok' },
            tone: 'notice',
          }
        : {
            text: "can't reach the suggestion service — still trying",
            cta: null,
            tone: 'quiet',
          }
  }
}
