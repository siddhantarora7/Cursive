import { useEffect, useRef, useState } from 'react'
import type { ByokProvider, Settings } from '../store/db'
import { getByokKey, setByokKey } from '../store/settings'
import { DEFAULT_MODELS } from '../ai/direct'
import { decodeThemeString, encodeThemeString } from '../core/theme/codec'
import { THEME_VARS, type Theme } from '../core/theme/types'
import { BUILTIN_THEMES, themeById } from '../themes'
import { FONTS } from '../themes/fonts'
import { Icon } from './icons'

function cssToHex(css: string): string {
  const el = document.createElement('div')
  el.style.color = css
  el.style.display = 'none'
  document.body.appendChild(el)
  const m = getComputedStyle(el).color.match(/(\d+)[, ]+(\d+)[, ]+(\d+)/)
  el.remove()
  if (!m) return '#888888'
  return (
    '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  )
}

const VAR_LABELS: Record<string, string> = {
  bg: 'Background',
  surface: 'Panels',
  ink: 'Text',
  muted: 'Secondary text',
  faint: 'Faint',
  accent: 'Accent',
  caret: 'Caret',
  ghost: 'Ghost text',
  selection: 'Selection',
  link: 'Links',
  border: 'Borders',
  danger: 'Danger',
}

function ThemeBuilder({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}) {
  const [shareDraft, setShareDraft] = useState('')
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'bad'>('idle')
  const active: Theme =
    settings.themeId === 'custom' && settings.customTheme
      ? settings.customTheme
      : themeById(settings.themeId)

  const patchCustom = (patch: Partial<Theme>, vars?: Partial<Theme['vars']>) => {
    const base: Theme = {
      ...active,
      id: 'custom',
      name: 'Custom',
      ...patch,
      vars: { ...active.vars, ...vars },
    }
    onChange({ themeId: 'custom', customTheme: base, themeChosen: true })
  }

  return (
    <div className="builder">
      <div className="builder-grid">
        {THEME_VARS.map((v) => (
          <label key={v} className="builder-row">
            <input
              type="color"
              value={cssToHex(active.vars[v])}
              onChange={(e) => {
                // color inputs can't carry alpha; selection gets a fixed one back
                const value = v === 'selection' ? `${e.target.value}55` : e.target.value
                patchCustom({}, { [v]: value })
              }}
            />
            {VAR_LABELS[v]}
          </label>
        ))}
      </div>
      <div className="builder-row-wide">
        <label>Font
          <select value={active.font} onChange={(e) => patchCustom({ font: e.target.value })}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label>Caret
          <select
            value={active.caretStyle}
            onChange={(e) => patchCustom({ caretStyle: e.target.value as Theme['caretStyle'] })}
          >
            <option value="bar">Bar</option>
            <option value="block">Block</option>
            <option value="underline">Underline</option>
          </select>
        </label>
      </div>
      <div className="share-row">
        <button
          type="button"
          className="btn-small"
          onClick={async () => {
            await navigator.clipboard.writeText(encodeThemeString(active))
            setShareState('copied')
            window.setTimeout(() => setShareState('idle'), 1500)
          }}
        >
          {shareState === 'copied' ? 'Copied!' : 'Copy share string'}
        </button>
        <input
          placeholder="cv1.… paste to import"
          value={shareDraft}
          className={shareState === 'bad' ? 'bad' : ''}
          onChange={(e) => {
            setShareDraft(e.target.value)
            setShareState('idle')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            const theme = decodeThemeString(shareDraft.trim())
            if (!theme) {
              setShareState('bad')
              return
            }
            onChange({
              themeId: 'custom',
              customTheme: { ...theme, id: 'custom' },
              themeChosen: true,
            })
            setShareDraft('')
          }}
        />
      </div>
      {shareState === 'bad' && <small className="field-hint">That string didn't decode — check it copied fully.</small>}
    </div>
  )
}

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
  focus,
  onClose,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  intent: string
  onIntentChange: (intent: string) => void
  quota: { used: number; limit: number } | null
  /** opened from a "use your own key" CTA — go straight to the key field */
  focus?: 'byok'
  onClose: () => void
}) {
  const [keyDraft, setKeyDraft] = useState(() => getByokKey(settings.byokProvider))
  const [builderOpen, setBuilderOpen] = useState(settings.themeId === 'custom')
  const keyInputRef = useRef<HTMLInputElement>(null)

  // Arriving from the exhausted-allowance CTA: the button said "use your own
  // key", so switching the mode is what was asked for, not a surprise.
  useEffect(() => {
    if (focus === 'byok' && settings.aiMode !== 'byok') onChange({ aiMode: 'byok' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  // …then land the caret in the field once the box exists.
  useEffect(() => {
    if (focus !== 'byok' || settings.aiMode !== 'byok') return
    keyInputRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    keyInputRef.current?.focus()
  }, [focus, settings.aiMode])

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
            {settings.customTheme && (
              <button
                type="button"
                className={`theme-card${settings.themeId === 'custom' ? ' selected' : ''}`}
                onClick={() => onChange({ themeId: 'custom', themeChosen: true })}
              >
                <span
                  className="theme-preview"
                  style={{ background: settings.customTheme.vars.bg, borderColor: settings.customTheme.vars.border }}
                >
                  <span className="theme-preview-ink" style={{ background: settings.customTheme.vars.ink }} />
                  <span className="theme-preview-ink short" style={{ background: settings.customTheme.vars.muted }} />
                  <span className="theme-preview-caret" style={{ background: settings.customTheme.vars.caret }} />
                </span>
                Custom
              </button>
            )}
          </div>
          <button type="button" className="btn-small builder-toggle" onClick={() => setBuilderOpen(!builderOpen)}>
            {builderOpen ? 'Hide theme builder' : 'Customize theme…'}
          </button>
          {builderOpen && <ThemeBuilder settings={settings} onChange={onChange} />}
        </section>

        <section>
          <h3>Effects</h3>
          <Switch label="Keystroke sparks" checked={settings.fx.sparks}
            onChange={(v) => onChange({ fx: { ...settings.fx, sparks: v } })} />
          <Switch label="Combo streak glow" hint="warms up as your WPM climbs"
            checked={settings.fx.streak}
            onChange={(v) => onChange({ fx: { ...settings.fx, streak: v } })} />
          <Switch label="Screen shake" hint="tiny, only at high combo"
            checked={settings.fx.shake}
            onChange={(v) => onChange({ fx: { ...settings.fx, shake: v } })} />
        </section>

        <section>
          <h3>Sound</h3>
          <label>Typing sounds
            <select
              value={settings.sound.pack}
              onChange={(e) => onChange({ sound: { ...settings.sound, pack: e.target.value as Settings['sound']['pack'] } })}
            >
              <option value="off">Off</option>
              <option value="thock">Thock</option>
              <option value="typewriter">Typewriter</option>
              <option value="pop">Pop</option>
            </select>
          </label>
          {settings.sound.pack !== 'off' && (
            <label className="slider-label">Volume
              <input type="range" min={0} max={100}
                value={Math.round(settings.sound.volume * 100)}
                onChange={(e) => onChange({ sound: { ...settings.sound, volume: Number(e.target.value) / 100 } })} />
            </label>
          )}
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
                <input ref={keyInputRef} type="password" value={keyDraft} placeholder="sk-…" autoComplete="off"
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
          <h3>Your writing stats</h3>
          <p className="field-hint">
            Cursive keeps a daily tally in this browser — words, time at the keys, hours you write
            in, how often you take a suggestion, and which words you reach for most. It is used
            only to draw your monthly report, it is never sent anywhere, and it disappears when you
            clear this site&rsquo;s data.
          </p>
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
