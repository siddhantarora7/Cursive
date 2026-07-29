import type { Editor } from '@tiptap/core'
import type { Settings } from '../store/db'
import { pmJsonToMarkdown } from '../core/text/markdown'
import { Dropdown } from './Dropdown'
import { useEditorTick } from './useEditorTick'

const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

/** Slim Docs-style menu bar — deliberately trimmed to features that exist. */
export function MenuBar({
  editor,
  settings,
  docTitle,
  onNewDoc,
  onToggleFind,
  onToggleZen,
  onToggleDemo,
  demo,
  onSettingsChange,
  onOpenSettings,
  onOpenStats,
}: {
  editor: Editor | null
  settings: Settings
  docTitle: string
  onNewDoc: () => void
  onToggleFind: () => void
  onToggleZen: () => void
  onToggleDemo: () => void
  demo: boolean
  onSettingsChange: (patch: Partial<Settings>) => void
  onOpenSettings: () => void
  onOpenStats: () => void
}) {
  useEditorTick(editor)
  if (!editor) return null

  const download = (name: string, text: string, type: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const exportName = docTitle.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'cursive'

  const Item = ({
    label,
    hint,
    disabled,
    checked,
    onClick,
    close,
  }: {
    label: string
    hint?: string
    disabled?: boolean
    checked?: boolean
    onClick: () => void
    close: () => void
  }) => (
    <button
      type="button"
      className="menu-item menubar-item"
      disabled={disabled}
      onClick={() => {
        onClick()
        close()
      }}
    >
      <span className="menubar-check">{checked ? '✓' : ''}</span>
      {label}
      {hint && <span className="menubar-hint">{hint}</span>}
    </button>
  )

  return (
    <nav className="menubar" aria-label="Menu">
      <Dropdown trigger={() => 'File'}>
        {(close) => (
          <>
            <Item label="New document" onClick={onNewDoc} close={close} />
            <div className="docs-divider" />
            <Item label="Copy as Markdown" close={close}
              onClick={() => void navigator.clipboard.writeText(pmJsonToMarkdown(editor.getJSON()))} />
            <Item label="Download as Markdown" close={close}
              onClick={() => download(`${exportName}.md`, pmJsonToMarkdown(editor.getJSON()), 'text/markdown')} />
            <Item label="Download as plain text" close={close}
              onClick={() => download(`${exportName}.txt`, editor.getText(), 'text/plain')} />
          </>
        )}
      </Dropdown>
      <Dropdown trigger={() => 'Edit'}>
        {(close) => (
          <>
            <Item label="Undo" hint={`${mod}Z`} disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()} close={close} />
            <Item label="Redo" hint={`${mod}⇧Z`} disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()} close={close} />
            <div className="docs-divider" />
            <Item label="Find & replace" hint={`${mod}F`} onClick={onToggleFind} close={close} />
          </>
        )}
      </Dropdown>
      <Dropdown trigger={() => 'View'}>
        {(close) => (
          <>
            <Item label="Zen mode" hint={`${mod}\\`} checked={settings.zen}
              onClick={onToggleZen} close={close} />
            <Item label="Demo mode" hint={`${mod}⇧D`} checked={demo}
              onClick={onToggleDemo} close={close} />
            <Item label="Autocorrect" checked={settings.autocorrect}
              onClick={() => onSettingsChange({ autocorrect: !settings.autocorrect })} close={close} />
            <Item label="Spellcheck" checked={settings.spellcheck}
              onClick={() => onSettingsChange({ spellcheck: !settings.spellcheck })} close={close} />
            <div className="docs-divider" />
            <Item label="Your writing stats…" onClick={onOpenStats} close={close} />
            <Item label="Settings…" onClick={onOpenSettings} close={close} />
          </>
        )}
      </Dropdown>
    </nav>
  )
}
