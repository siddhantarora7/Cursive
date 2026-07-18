import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { buildCompletionFn } from '../ai'
import { parseDictionary, type Dictionary } from '../core/autocorrect/dictionary'
import { LiveStats } from '../core/stats/live'
import { wordCount } from '../core/text/context'
import { FxLayer } from '../fx/engine'
import { SoundEngine } from '../sound'
import wordsUrl from '../assets/en-words.txt?url'
import { SmoothCaret } from '../editor/caret'
import { createCursiveEditor, deriveTitle } from '../editor/setup'
import {
  SuggestionController,
  type CompletionFn,
} from '../editor/suggestionController'
import type { DocRecord, Settings } from '../store/db'
import { createDoc, deleteDoc, getDoc, listDocs, saveDocContent, updateDocMeta } from '../store/docs'
import { loadSettings, saveSettings } from '../store/settings'
import { ensureFontLoaded, fontById } from '../themes/fonts'
import { applyTheme, themeById } from '../themes'
import { DemoOverlay } from './DemoOverlay'
import { DocsPopover } from './DocsPopover'
import { FindReplaceBar } from './FindReplaceBar'
import { MenuBar } from './MenuBar'
import { SettingsPanel } from './SettingsPanel'
import { StatusBar } from './StatusBar'
import { Toolbar } from './Toolbar'
import '../styles/chrome.css'

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [intent, setIntent] = useState('')
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)
  const [aiPaused, setAiPaused] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [words, setWords] = useState(0)
  const [demo, setDemo] = useState(false)

  const mountRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const fxCanvasRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<FxLayer | null>(null)
  const statsRef = useRef(new LiveStats())
  const soundRef = useRef(new SoundEngine())
  const lastGeomRef = useRef({ x: 0, y: 0 })
  const caretRef = useRef<SmoothCaret | null>(null)
  const controllerRef = useRef<SuggestionController | null>(null)
  const completionRef = useRef<CompletionFn | null>(null)
  const dictRef = useRef<Dictionary | null>(null)
  const autocorrectRef = useRef(true)
  const intentRef = useRef('')
  const saveTimer = useRef(0)
  const zenPeekTimer = useRef(0)
  const [zenPeek, setZenPeek] = useState(false)

  intentRef.current = intent

  /* ---------- boot: settings + docs + autocorrect dictionary ---------- */
  useEffect(() => {
    void (async () => {
      const s = await loadSettings()
      let list = await listDocs()
      if (list.length === 0) list = [await createDoc()]
      setSettings(s)
      setDocs(list)
      setActiveId(list[0]!.id)
    })()
    // lazy: the 82k-word list never blocks first paint or first keystroke
    void fetch(wordsUrl)
      .then((r) => r.text())
      .then((text) => {
        dictRef.current = parseDictionary(text)
      })
      .catch(() => {})
  }, [])

  /* ---------- fx layer + sound (created once, after first render with settings) ---------- */
  useEffect(() => {
    if (!settings || !fxCanvasRef.current || !scrollRef.current || fxRef.current) return
    fxRef.current = new FxLayer(fxCanvasRef.current, scrollRef.current)
    // combo decays on a slow tick even when the keys go quiet
    const tick = window.setInterval(() => {
      fxRef.current?.setCombo(statsRef.current.comboLevel(Date.now()))
    }, 400)
    const sound = soundRef.current
    return () => {
      window.clearInterval(tick)
      fxRef.current?.destroy()
      fxRef.current = null
      sound.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings === null])

  /* ---------- typing sounds: real keydowns, throttled inside the engine ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!editor?.isFocused) return
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
        soundRef.current.play(e.key === ' ' ? 'space' : e.key === 'Enter' ? 'return' : 'key')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor])

  /* ---------- settings side-effects ---------- */
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.style.setProperty('--editor-font-size', `${settings.editorFontSize / 16}rem`)
    root.style.setProperty('--editor-line-height', String(settings.lineHeight))
    const theme = settings.themeId === 'custom' && settings.customTheme
      ? settings.customTheme
      : themeById(settings.themeId)
    applyTheme(theme)
    fxRef.current?.readThemeColors()
    fxRef.current?.setFlags(settings.fx)
    soundRef.current.configure(settings.sound.pack, settings.sound.volume)
    const fontId = settings.fontOverride ?? theme.font
    root.style.setProperty('--font-editor', fontById(fontId).stack)
    void ensureFontLoaded(fontId)
    completionRef.current = buildCompletionFn(settings)
    controllerRef.current?.setEnabled(completionRef.current !== null)
    autocorrectRef.current = settings.autocorrect
    caretRef.current?.setConfig(settings.caret)
    editor?.setOptions({
      editorProps: {
        attributes: {
          class: 'cursive-editor',
          spellcheck: settings.spellcheck ? 'true' : 'false',
        },
      },
    })
    void saveSettings(settings)
  }, [settings, editor])

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s))
  }, [])

  /* ---------- editor lifecycle (recreated per document: clean undo history) ---------- */
  useEffect(() => {
    if (!activeId || !settings || !mountRef.current || !scrollRef.current) return
    let disposed = false
    let ed: Editor | null = null
    let caret: SmoothCaret | null = null
    let controller: SuggestionController | null = null

    void (async () => {
      const doc = await getDoc(activeId)
      if (disposed || !doc) return
      setIntent(doc.intent)
      intentRef.current = doc.intent

      ed = createCursiveEditor({
        element: mountRef.current!,
        content: doc.content,
        spellcheck: settings.spellcheck,
        ghost: {
          onAccept: () => {
            controllerRef.current?.notifyAccepted()
            fxRef.current?.pushAccept(lastGeomRef.current.x, lastGeomRef.current.y)
          },
          onDismiss: () => controllerRef.current?.notifyDismissed(),
        },
        autocorrect: {
          isEnabled: () => autocorrectRef.current,
          getDictionary: () => dictRef.current,
        },
        onUpdate: (e) => {
          window.clearTimeout(saveTimer.current)
          saveTimer.current = window.setTimeout(() => void persist(e), 800)
          setWords(wordCount(e.state.doc.textContent))
        },
        onSelectionUpdate: () => caretRef.current?.update(),
        onTransaction: (e, tr) => {
          caretRef.current?.update()
          controllerRef.current?.handleTransaction(tr)
          if (tr.docChanged) {
            const now = Date.now()
            statsRef.current.record(now)
            const fx = fxRef.current
            if (fx) {
              fx.setCombo(statsRef.current.comboLevel(now))
              fx.pushKey(lastGeomRef.current.x, lastGeomRef.current.y)
            }
          }
          void e
        },
      })

      caret = new SmoothCaret(scrollRef.current!, ed.view, settings.caret)
      caret.onGeometry((g) => {
        // fx canvas sits over the scroll viewport → convert content y to viewport y
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        lastGeomRef.current = { x: g.x, y: g.y - scrollTop + g.height / 2 }
        fxRef.current?.setCaret(lastGeomRef.current.x, lastGeomRef.current.y)
      })
      controller = new SuggestionController(ed, {
        complete: (req) =>
          completionRef.current
            ? completionRef.current(req)
            : Promise.resolve({ ok: false as const, cause: 'net' as const }),
        getIntent: () => intentRef.current,
        onQuota: (q) => {
          setQuota(q)
          setAiPaused(false)
        },
        onCapExhausted: () => setAiPaused(true),
      })
      controller.setEnabled(buildCompletionFn(settings) !== null)
      caretRef.current = caret
      controllerRef.current = controller
      setEditor(ed)
      if (import.meta.env.DEV) {
        // dev-only handle for smoke tests and ghost-text demos without a proxy
        ;(window as unknown as Record<string, unknown>).__cursive = { editor: ed }
      }
      setWords(wordCount(ed.state.doc.textContent))
      ed.commands.focus('end')
    })()

    const persist = async (e: Editor) => {
      await saveDocContent(activeId, e.getJSON() as Record<string, unknown>, {
        title: deriveTitle(e),
        wordCount: wordCount(e.state.doc.textContent),
      })
      setDocs(await listDocs())
    }

    const flush = () => {
      window.clearTimeout(saveTimer.current)
      if (ed && !ed.isDestroyed) void persist(ed)
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      disposed = true
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
      controller?.dispose()
      caret?.destroy()
      ed?.destroy()
      controllerRef.current = null
      caretRef.current = null
      setEditor(null)
      setFindOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  /* ---------- global shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setFindOpen((v) => !v)
      } else if (mod && e.key === '\\') {
        e.preventDefault()
        patchSettings({ zen: !(settings?.zen ?? false) })
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setDemo((v) => !v)
      } else if (mod && e.shiftKey && (e.key === ',' || e.key === '<')) {
        e.preventDefault()
        patchSettings({ editorFontSize: Math.max(13, (settings?.editorFontSize ?? 17) - 1) })
      } else if (mod && e.shiftKey && (e.key === '.' || e.key === '>')) {
        e.preventDefault()
        patchSettings({ editorFontSize: Math.min(28, (settings?.editorFontSize ?? 17) + 1) })
      } else if (
        e.key === 'Escape' &&
        !e.defaultPrevented && // e.g. the editor already used it to dismiss a ghost
        settings?.zen &&
        !findOpen &&
        !settingsOpen
      ) {
        patchSettings({ zen: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings, patchSettings, findOpen, settingsOpen])

  /* ---------- zen peek: chrome ghosts back on mouse move ---------- */
  useEffect(() => {
    if (!settings?.zen) return
    const onMove = () => {
      setZenPeek(true)
      window.clearTimeout(zenPeekTimer.current)
      zenPeekTimer.current = window.setTimeout(() => setZenPeek(false), 1600)
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.clearTimeout(zenPeekTimer.current)
    }
  }, [settings?.zen])

  /* ---------- doc actions ---------- */
  const switchDoc = (id: string) => {
    if (id !== activeId) setActiveId(id)
  }
  const newDoc = async () => {
    const doc = await createDoc()
    setDocs(await listDocs())
    setActiveId(doc.id)
  }
  const renameDoc = async (id: string, title: string) => {
    await updateDocMeta(id, { title })
    setDocs(await listDocs())
  }
  const removeDoc = async (id: string) => {
    await deleteDoc(id)
    let list = await listDocs()
    if (list.length === 0) list = [await createDoc()]
    setDocs(list)
    if (id === activeId) setActiveId(list[0]!.id)
  }
  const changeIntent = (value: string) => {
    setIntent(value)
    if (activeId) void updateDocMeta(activeId, { intent: value })
  }

  if (!settings) return <div className="app" />

  const activeDoc = docs.find((d) => d.id === activeId)
  const zenClass =
    settings.zen || demo ? ` zen${zenPeek && !demo ? ' zen-peek' : ''}${demo ? ' demo' : ''}` : ''

  return (
    <div className={`app${zenClass}`}>
      <header className="app-chrome-top">
        <div className="topbar">
          <span className="brand" title="Cursive">✳ Cursive</span>
          <DocsPopover
            docs={docs}
            activeId={activeId}
            title={activeDoc?.title ?? 'Untitled'}
            onSwitch={switchDoc}
            onCreate={() => void newDoc()}
            onRename={(id, t) => void renameDoc(id, t)}
            onDelete={(id) => void removeDoc(id)}
          />
          <MenuBar
            editor={editor}
            settings={settings}
            docTitle={activeDoc?.title ?? 'cursive'}
            onNewDoc={() => void newDoc()}
            onToggleFind={() => setFindOpen((v) => !v)}
            onToggleZen={() => patchSettings({ zen: !settings.zen })}
            onToggleDemo={() => setDemo((v) => !v)}
            demo={demo}
            onSettingsChange={patchSettings}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
        <Toolbar
          editor={editor}
          settings={settings}
          onSettingsChange={patchSettings}
          onToggleFind={() => setFindOpen((v) => !v)}
          onToggleZen={() => patchSettings({ zen: !settings.zen })}
          onOpenSettings={() => setSettingsOpen(true)}
          docTitle={activeDoc?.title ?? 'cursive'}
        />
        {findOpen && editor && <FindReplaceBar editor={editor} onClose={() => setFindOpen(false)} />}
      </header>

      <div className="editor-stage">
        <main className="app-editor-scroll" ref={scrollRef}>
          <div className="editor-page">
            <div ref={mountRef} />
          </div>
        </main>
        <canvas className="fx-canvas" ref={fxCanvasRef} aria-hidden="true" />
        {demo && <DemoOverlay stats={statsRef.current} />}
      </div>

      <footer className="app-statusbar">
        <StatusBar
          words={words}
          quota={quota}
          settings={settings}
          aiPaused={aiPaused}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </footer>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={patchSettings}
          intent={intent}
          onIntentChange={changeIntent}
          quota={quota}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
