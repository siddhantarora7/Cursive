import { wordCount } from '../text/context'
import { fnv1a } from './hash'
import { LruCache } from './lru'
import { vetSuggestion } from './quality'
import type { SuggestionStatus } from './status'

/**
 * The suggestion policy state machine. Pure: no timers, no fetch, no DOM.
 * The host feeds it events with a timestamp; it answers with actions:
 *  - schedule(at): host should call back with a `tick` at (or after) that time
 *  - request(id, context): host should fetch a completion (AbortController per id)
 *  - cancel(id): host should abort that request
 *  - show(text) / clear: host should render / remove ghost text
 */

export interface PolicyConfig {
  debounceMs: number
  minContextWords: number
  maxSuggestionWords: number
  cacheSize: number
  backoffBaseMs: number
  backoffCapMs: number
}

export const DEFAULT_POLICY: PolicyConfig = {
  debounceMs: 400,
  minContextWords: 3,
  maxSuggestionWords: 12,
  cacheSize: 64,
  backoffBaseMs: 1000,
  backoffCapMs: 60_000,
}

/**
 * How long a server-side kill switch is believed before we probe again.
 * Short enough that flipping AI back on doesn't strand a writer for the session.
 */
export const DISABLED_RETRY_MS = 10 * 60_000

/**
 * One failed request is a blip and must stay silent — a status line that
 * flickers on every dropped packet trains the user to ignore it. Two in a row
 * is a real outage and earns words.
 */
export const UNREACHABLE_AFTER_FAILURES = 2

export type PolicyEvent =
  | { kind: 'typed'; context: string }
  | { kind: 'moved' }
  | { kind: 'blur' }
  | { kind: 'tick' }
  | { kind: 'response'; id: number; raw: string }
  | { kind: 'failure'; id: number; cause: 'net' | 'rate' | 'providers' }
  /** server told us to stop for a while, and why */
  | { kind: 'paused'; id: number; reason: 'cap' | 'disabled'; resumeAt: number }
  | { kind: 'accepted' }
  | { kind: 'dismissed' }
  | { kind: 'compositionStart' }
  | { kind: 'compositionEnd' }
  | { kind: 'setEnabled'; enabled: boolean }

export type PolicyAction =
  | { kind: 'schedule'; at: number }
  | { kind: 'request'; id: number; context: string }
  | { kind: 'cancel'; id: number }
  | { kind: 'show'; text: string }
  | { kind: 'clear' }
  /** a model answer the quality filter dropped — the user sees nothing, but
   *  the rate is worth knowing, so it is reported rather than swallowed */
  | { kind: 'rejected' }

export class SuggestionPolicy {
  private cache: LruCache<string, string>
  private pendingContext: string | null = null
  private deadline = 0
  private inflightId: number | null = null
  private nextId = 1
  private shown = false
  private pausedUntil = 0
  /** why we are paused — null when running normally */
  private pauseKind: 'cap' | 'disabled' | 'rate' | 'unreachable' | null = null
  private failures = 0
  private cooledHash: string | null = null
  private composing = false
  private enabled = true

  constructor(
    private cfg: PolicyConfig,
    private isWord?: (word: string) => boolean,
  ) {
    this.cache = new LruCache(cfg.cacheSize)
  }

  handle(ev: PolicyEvent, now: number): PolicyAction[] {
    switch (ev.kind) {
      case 'typed':
        return this.onTyped(ev.context, now)
      case 'tick':
        return this.onTick(now)
      case 'response':
        return this.onResponse(ev.id, ev.raw)
      case 'failure':
        return this.onFailure(ev.id, ev.cause, now)
      case 'paused':
        return this.onPaused(ev.id, ev.reason, ev.resumeAt)
      case 'moved':
      case 'blur':
        return this.reset()
      case 'accepted':
        return this.reset()
      case 'dismissed': {
        if (this.pendingContext !== null) this.cooledHash = fnv1a(this.pendingContext)
        return this.reset()
      }
      case 'compositionStart': {
        this.composing = true
        return this.reset()
      }
      case 'compositionEnd': {
        this.composing = false
        return []
      }
      case 'setEnabled': {
        this.enabled = ev.enabled
        return ev.enabled ? [] : this.reset()
      }
    }
  }

  private onTyped(context: string, now: number): PolicyAction[] {
    const actions = this.reset()
    if (this.composing || !this.enabled) return actions
    if (this.cooledHash !== null && fnv1a(context) !== this.cooledHash) {
      this.cooledHash = null
    }
    this.pendingContext = context
    this.deadline = now + this.cfg.debounceMs
    if (
      wordCount(context) >= this.cfg.minContextWords &&
      this.cooledHash === null
    ) {
      actions.push({ kind: 'schedule', at: this.deadline })
    }
    return actions
  }

  private onTick(now: number): PolicyAction[] {
    if (this.pendingContext === null || this.shown || this.inflightId !== null) return []
    if (now + 2 < this.deadline) return [{ kind: 'schedule', at: this.deadline }]
    if (this.composing || !this.enabled || now < this.pausedUntil) return []
    const context = this.pendingContext
    if (wordCount(context) < this.cfg.minContextWords) return []
    const hash = fnv1a(context)
    if (hash === this.cooledHash) return []
    const cached = this.cache.get(hash)
    if (cached !== undefined) {
      this.shown = true
      return [{ kind: 'show', text: cached }]
    }
    const id = this.nextId++
    this.inflightId = id
    return [{ kind: 'request', id, context }]
  }

  private onResponse(id: number, raw: string): PolicyAction[] {
    if (id !== this.inflightId || this.pendingContext === null) return []
    this.inflightId = null
    this.failures = 0
    this.pauseKind = null
    this.pausedUntil = 0
    const vetted = vetSuggestion(raw, this.pendingContext, this.cfg.maxSuggestionWords, this.isWord)
    if (vetted === null) return [{ kind: 'rejected' }]
    this.cache.set(fnv1a(this.pendingContext), vetted)
    this.shown = true
    return [{ kind: 'show', text: vetted }]
  }

  private onFailure(
    id: number,
    cause: 'net' | 'rate' | 'providers',
    now: number,
  ): PolicyAction[] {
    if (id !== this.inflightId) return []
    this.inflightId = null
    this.failures += 1
    const delay = Math.min(
      this.cfg.backoffBaseMs * 2 ** (this.failures - 1),
      this.cfg.backoffCapMs,
    )
    this.pausedUntil = now + delay
    // 'providers' means every upstream model errored: from where the writer
    // sits that is indistinguishable from the network being down, and it is
    // equally not their fault.
    this.pauseKind = cause === 'rate' ? 'rate' : 'unreachable'
    return []
  }

  private onPaused(
    id: number,
    reason: 'cap' | 'disabled',
    resumeAt: number,
  ): PolicyAction[] {
    if (id === this.inflightId) this.inflightId = null
    this.pausedUntil = resumeAt
    this.pauseKind = reason
    return []
  }

  /**
   * What the chrome should say right now. Pure read — no state change — so the
   * UI can poll it without perturbing the machine.
   */
  statusAt(now: number): SuggestionStatus {
    if (!this.enabled) return { kind: 'off' }
    if (this.pauseKind === null || now >= this.pausedUntil) return { kind: 'ready' }
    switch (this.pauseKind) {
      case 'cap':
        return { kind: 'exhausted', resumeAt: this.pausedUntil }
      case 'disabled':
        return { kind: 'disabled' }
      case 'rate':
        return { kind: 'rate-limited', retryAt: this.pausedUntil }
      case 'unreachable':
        return this.failures >= UNREACHABLE_AFTER_FAILURES
          ? { kind: 'unreachable', retryAt: this.pausedUntil }
          : { kind: 'ready' }
    }
  }

  /** Cancel in-flight work and clear any shown suggestion. */
  private reset(): PolicyAction[] {
    const actions: PolicyAction[] = []
    if (this.inflightId !== null) {
      actions.push({ kind: 'cancel', id: this.inflightId })
      this.inflightId = null
    }
    if (this.shown) {
      actions.push({ kind: 'clear' })
      this.shown = false
    }
    this.pendingContext = null
    return actions
  }
}
