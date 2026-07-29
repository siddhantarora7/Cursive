import { describeStatus, type AiSource, type SuggestionStatus } from '../core/suggestion/status'
import type { Settings } from '../store/db'
import { Icon } from './icons'

export function StatusBar({
  words,
  quota,
  settings,
  status,
  onOpenSettings,
}: {
  words: number
  quota: { used: number; limit: number } | null
  settings: Settings
  status: SuggestionStatus
  onOpenSettings: (focus?: 'byok') => void
}) {
  const source: AiSource = settings.aiMode === 'byok' ? 'byok' : 'free'
  // the wording and the "back in 3h" arithmetic live in core/, under test
  const note = describeStatus(status, Date.now(), source)
  const left = quota ? Math.max(0, quota.limit - quota.used) : null

  return (
    <div className="statusbar">
      <span className="status-words">
        {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
      </span>
      <span className="status-spacer" />

      {note ? (
        <span className={`status-note ${note.tone}`} role="status">
          {note.text}
          {note.cta && (
            <button type="button" className="status-cta" onClick={() => onOpenSettings('byok')}>
              {note.cta.label}
            </button>
          )}
        </span>
      ) : settings.aiMode === 'free' && quota ? (
        <span className="status-quota" title={`${left} free suggestions left today`}>
          <Icon name="sparkle" size={12} />
          <span className="quota-bar">
            <span
              className="quota-fill"
              style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
            />
          </span>
          {left}
        </span>
      ) : settings.aiMode === 'byok' ? (
        <span className="status-quota" title="Using your key — unlimited">
          <Icon name="sparkle" size={12} /> your key
        </span>
      ) : null}
    </div>
  )
}
