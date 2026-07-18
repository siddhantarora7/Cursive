import type { Settings } from '../store/db'
import { Icon } from './icons'

export function StatusBar({
  words,
  quota,
  settings,
  aiPaused,
  onOpenSettings,
}: {
  words: number
  quota: { used: number; limit: number } | null
  settings: Settings
  aiPaused: boolean
  onOpenSettings: () => void
}) {
  const left = quota ? Math.max(0, quota.limit - quota.used) : null
  return (
    <div className="statusbar">
      <span className="status-words">{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span>
      <span className="status-spacer" />
      {settings.aiMode === 'free' && quota && !aiPaused && (
        <span className="status-quota" title={`${left} free suggestions left today`}>
          <Icon name="sparkle" size={12} />
          <span className="quota-bar">
            <span className="quota-fill" style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }} />
          </span>
          {left}
        </span>
      )}
      {aiPaused && settings.aiMode === 'free' && (
        <button type="button" className="status-notice" onClick={onOpenSettings}>
          free suggestions are done for today — add your own key for unlimited
        </button>
      )}
      {settings.aiMode === 'byok' && (
        <span className="status-quota" title="Using your key — unlimited">
          <Icon name="sparkle" size={12} /> your key
        </span>
      )}
    </div>
  )
}
