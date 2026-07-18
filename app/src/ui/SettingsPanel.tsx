import { useState } from 'react'
import type { ByokProvider, Settings } from '../store/db'
import { getByokKey, setByokKey } from '../store/settings'
import { DEFAULT_MODELS } from '../ai/direct'
import { Icon } from './icons'

const PROVIDERS: Array<{ id: ByokProvider; label: string }> = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
]

export function SettingsPanel({
  settings,
  onChange,
  intent,
  onIntentChange,
  quota,
  onClose,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  intent: string
  onIntentChange: (intent: string) => void
  quota: { used: number; limit: number } | null
  onClose: () => void
}) {
  const [keyDraft, setKeyDraft] = useState(() => getByokKey(settings.byokProvider))

  const pickProvider = (p: ByokProvider) => {
    onChange({ byokProvider: p, byokModel: '' })
    setKeyDraft(getByokKey(p))
  }

  return (
    <div className="settings-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="settings-panel" role="dialog" aria-label="Settings">
        <header className="settings-head">
          <h2>Settings</h2>
          <button type="button" className="tb-btn" onClick={onClose} aria-label="Close settings">
            <Icon name="close" />
          </button>
        </header>

        <section>
          <h3><Icon name="sparkle" size={14} /> Suggestions</h3>
          <label className="radio">
            <input type="radio" name="aimode" checked={settings.aiMode === 'free'}
              onChange={() => onChange({ aiMode: 'free' })} />
            <span>
              <strong>Free</strong> — {quota ? `${Math.max(0, quota.limit - quota.used)} of ${quota.limit} left today` : '150 suggestions/day'}
              <small className="disclosure">
                Free suggestions run through our proxy on free model tiers; those providers may
                use the text sent (up to ~1,000 characters before your cursor) to train their
                models. Your document itself never leaves this browser.
              </small>
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="aimode" checked={settings.aiMode === 'byok'}
              onChange={() => onChange({ aiMode: 'byok' })} />
            <span>
              <strong>Your own key</strong> — unlimited
              <small className="disclosure">
                Your key is stored only in this browser and sent directly to the provider —
                never to our servers. Your provider's data policy applies.
              </small>
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="aimode" checked={settings.aiMode === 'off'}
              onChange={() => onChange({ aiMode: 'off' })} />
            <span><strong>Off</strong> — just the editor</span>
          </label>

          {settings.aiMode === 'byok' && (
            <div className="byok-box">
              <label>Provider
                <select value={settings.byokProvider} onChange={(e) => pickProvider(e.target.value as ByokProvider)}>
                  {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label>API key
                <input type="password" value={keyDraft} placeholder="sk-…" autoComplete="off"
                  onChange={(e) => { setKeyDraft(e.target.value); setByokKey(settings.byokProvider, e.target.value.trim()) }} />
              </label>
              <label>Model
                <input value={settings.byokModel} placeholder={DEFAULT_MODELS[settings.byokProvider]}
                  onChange={(e) => onChange({ byokModel: e.target.value.trim() })} />
              </label>
            </div>
          )}
        </section>

        <section>
          <h3>This document</h3>
          <label>Intent
            <textarea
              rows={3}
              placeholder={'e.g. "college essay, direct tone, no em dashes" — sent with every suggestion request'}
              value={intent}
              onChange={(e) => onIntentChange(e.target.value)}
            />
          </label>
        </section>

        <section>
          <h3>Feel</h3>
          <label>Caret smoothing
            <input type="range" min={0} max={100}
              value={Math.round(settings.caret.smoothing * 100)}
              onChange={(e) => onChange({ caret: { ...settings.caret, smoothing: Number(e.target.value) / 100 } })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.caret.blink}
              onChange={(e) => onChange({ caret: { ...settings.caret, blink: e.target.checked } })} />
            Caret blink
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.spellcheck}
              onChange={(e) => onChange({ spellcheck: e.target.checked })} />
            Spellcheck
          </label>
        </section>

        <section className="settings-privacy">
          <h3>Privacy</h3>
          <p>
            Documents live in this browser (IndexedDB) and nowhere else. The only data that
            ever leaves is the suggestion context described above, at suggestion time. No
            accounts, no analytics, no server-side storage.
          </p>
        </section>
      </aside>
    </div>
  )
}
