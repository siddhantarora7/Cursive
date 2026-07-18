import { useState } from 'react'
import type { ByokProvider, Settings } from '../store/db'
import { getByokKey, setByokKey } from '../store/settings'
import { DEFAULT_MODELS } from '../ai/direct'
import { BUILTIN_THEMES } from '../themes'
import { Icon } from './icons'

const PROVIDERS: Array<{ id: ByokProvider; label: string }> = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
]

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="switch-row">
      <span className="switch-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch${checked ? ' on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-thumb" />
      </span>
    </label>
  )
}

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

  const aiModes = [
    {
      id: 'free' as const,
      title: 'Free',
      meta: quota
        ? `${Math.max(0, quota.limit - quota.used)} of ${quota.limit} left today`
        : '150 suggestions a day',
      note: 'Runs through our proxy on free model tiers — those providers may train on the snippet sent (≤ ~1,000 characters before your cursor). Your document itself never leaves this browser.',
    },
    {
      id: 'byok' as const,
      title: 'Your own key',
      meta: 'unlimited',
      note: 'The key lives only in this browser and goes straight to your provider — never to our servers.',
    },
    {
      id: 'off' as const,
      title: 'Off',
      meta: 'just the editor',
      note: null,
    },
  ]

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
          <h3>Appearance</h3>
          <div className="theme-grid">
            {BUILTIN_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-card${settings.themeId === t.id ? ' selected' : ''}`}
                onClick={() => onChange({ themeId: t.id, themeChosen: true })}
              >
                <span className="theme-preview" style={{ background: t.vars.bg, borderColor: t.vars.border }}>
                  <span className="theme-preview-ink" style={{ background: t.vars.ink }} />
                  <span className="theme-preview-ink short" style={{ background: t.vars.muted }} />
                  <span className="theme-preview-caret" style={{ background: t.vars.caret }} />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Suggestions</h3>
          <div className="option-cards" role="radiogroup" aria-label="Suggestion mode">
            {aiModes.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={settings.aiMode === m.id}
                className={`option-card${settings.aiMode === m.id ? ' selected' : ''}`}
                onClick={() => onChange({ aiMode: m.id })}
              >
                <span className="option-title">
                  {m.title}
                  <span className="option-meta">{m.meta}</span>
                </span>
                {m.note && <span className="option-note">{m.note}</span>}
              </button>
            ))}
          </div>

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

          <label className="intent-label">Document intent
            <textarea
              rows={2}
              placeholder="college essay, direct tone, no em dashes"
              value={intent}
              onChange={(e) => onIntentChange(e.target.value)}
            />
            <small className="field-hint">Sent with every suggestion for this document.</small>
          </label>
        </section>

        <section>
          <h3>Editor</h3>
          <Switch label="Autocorrect" hint="fixes slips like waht → what as you type; Backspace undoes one"
            checked={settings.autocorrect} onChange={(v) => onChange({ autocorrect: v })} />
          <Switch label="Spellcheck" hint="the browser's red underlines"
            checked={settings.spellcheck} onChange={(v) => onChange({ spellcheck: v })} />
        </section>

        <section>
          <h3>Feel</h3>
          <label className="slider-label">Caret smoothing
            <input type="range" min={0} max={100}
              value={Math.round(settings.caret.smoothing * 100)}
              onChange={(e) => onChange({ caret: { ...settings.caret, smoothing: Number(e.target.value) / 100 } })} />
            <span className="slider-ends"><span>instant</span><span>floaty</span></span>
          </label>
          <Switch label="Caret blink" checked={settings.caret.blink}
            onChange={(v) => onChange({ caret: { ...settings.caret, blink: v } })} />
        </section>

        <section className="settings-privacy">
          <p>
            Documents live in this browser (IndexedDB) and nowhere else. The only data that ever
            leaves is the suggestion context described above, at suggestion time. No accounts,
            no analytics, no server-side storage.
          </p>
        </section>
      </aside>
    </div>
  )
}
