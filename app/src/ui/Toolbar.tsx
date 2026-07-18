import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import type { Settings } from '../store/db'
import { FONTS } from '../themes/fonts'
import { pmJsonToMarkdown } from '../core/text/markdown'
import { Dropdown } from './Dropdown'
import { Icon } from './icons'
import { useEditorTick } from './useEditorTick'

const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

interface ToolbarProps {
  editor: Editor | null
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onToggleFind: () => void
  onToggleZen: () => void
  onOpenSettings: () => void
  docTitle: string
}

function Btn({
  icon,
  title,
  active,
  disabled,
  onClick,
}: {
  icon: string
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`tb-btn${active ? ' active' : ''}`}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  )
}

const Sep = () => <span className="tb-sep" aria-hidden="true" />

const BLOCKS = [
  { id: 'p', label: 'Normal text' },
  { id: 'h1', label: 'Heading 1' },
  { id: 'h2', label: 'Heading 2' },
  { id: 'h3', label: 'Heading 3' },
  { id: 'quote', label: 'Quote' },
  { id: 'codeBlock', label: 'Code block' },
]

const ALIGNS = [
  { id: 'left', icon: 'alignLeft', label: `Align left (${mod}⇧L)` },
  { id: 'center', icon: 'alignCenter', label: `Align center (${mod}⇧E)` },
  { id: 'right', icon: 'alignRight', label: `Align right (${mod}⇧R)` },
  { id: 'justify', icon: 'alignJustify', label: `Justify (${mod}⇧J)` },
]

const LINE_HEIGHTS = [1.4, 1.55, 1.7, 1.9, 2.2]
const TEXT_COLORS = ['', '#e05252', '#e08b3c', '#d9b23a', '#5ec87a', '#5ec8bf', '#6a9ee0', '#b07ad9']
const HIGHLIGHTS = ['#fde04766', '#5ec8bf55', '#e0525255', '#6a9ee055', '#b07ad955']

export function Toolbar(props: ToolbarProps) {
  const { editor, settings, onSettingsChange } = props
  useEditorTick(editor)
  const [linkUrl, setLinkUrl] = useState('')

  if (!editor) return <div className="toolbar" />

  const blockId = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : editor.isActive('blockquote')
          ? 'quote'
          : editor.isActive('codeBlock')
            ? 'codeBlock'
            : 'p'

  const setBlock = (id: string) => {
    const chain = editor.chain().focus()
    if (id === 'p') chain.setParagraph().run()
    else if (id === 'quote') chain.toggleBlockquote().run()
    else if (id === 'codeBlock') chain.toggleCodeBlock().run()
    else chain.toggleHeading({ level: Number(id[1]) as 1 | 2 | 3 }).run()
  }

  const align = ALIGNS.find((a) => editor.isActive({ textAlign: a.id })) ?? ALIGNS[0]!
  const fontId = settings.fontOverride ?? '__theme'

  const download = (name: string, text: string, type: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const exportName = props.docTitle.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'cursive'

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <Btn icon="undo" title={`Undo (${mod}Z)`} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <Btn icon="redo" title={`Redo (${mod}⇧Z)`} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      <Sep />

      <Dropdown
        title="Font"
        trigger={() => (
          <span className="tb-labelled">
            {FONTS.find((f) => f.id === fontId)?.label ?? 'Theme font'}
            <Icon name="chevron" size={12} />
          </span>
        )}
      >
        {(close) => (
          <>
            <button type="button" className={`menu-item${fontId === '__theme' ? ' checked' : ''}`}
              onClick={() => { onSettingsChange({ fontOverride: null }); close() }}>
              Theme font
            </button>
            {FONTS.map((f) => (
              <button key={f.id} type="button" style={{ fontFamily: f.stack }}
                className={`menu-item${fontId === f.id ? ' checked' : ''}`}
                onClick={() => { onSettingsChange({ fontOverride: f.id }); close() }}>
                {f.label}
              </button>
            ))}
          </>
        )}
      </Dropdown>

      <div className="tb-size" title={`Text size (${mod}⇧, / ${mod}⇧.)`}>
        <button type="button" className="tb-btn" aria-label="Smaller text"
          onClick={() => onSettingsChange({ editorFontSize: Math.max(13, settings.editorFontSize - 1) })}>−</button>
        <span className="tb-size-value">{settings.editorFontSize}</span>
        <button type="button" className="tb-btn" aria-label="Larger text"
          onClick={() => onSettingsChange({ editorFontSize: Math.min(28, settings.editorFontSize + 1) })}>+</button>
      </div>
      <Sep />

      <Dropdown
        title="Paragraph style"
        trigger={() => (
          <span className="tb-labelled">
            {BLOCKS.find((b) => b.id === blockId)?.label}
            <Icon name="chevron" size={12} />
          </span>
        )}
      >
        {(close) => BLOCKS.map((b) => (
          <button key={b.id} type="button" className={`menu-item${blockId === b.id ? ' checked' : ''}`}
            onClick={() => { setBlock(b.id); close() }}>
            {b.label}
          </button>
        ))}
      </Dropdown>
      <Sep />

      <Btn icon="bold" title={`Bold (${mod}B)`} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn icon="italic" title={`Italic (${mod}I)`} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn icon="underline" title={`Underline (${mod}U)`} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Btn icon="strike" title={`Strikethrough (${mod}⇧S)`} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Sep />

      <Dropdown title="Alignment" trigger={() => <Icon name={align.icon} />}>
        {(close) => ALIGNS.map((a) => (
          <button key={a.id} type="button" className={`menu-item${align.id === a.id ? ' checked' : ''}`}
            onClick={() => { editor.chain().focus().setTextAlign(a.id).run(); close() }}>
            <Icon name={a.icon} /> {a.label}
          </button>
        ))}
      </Dropdown>

      <Dropdown title="Line spacing" trigger={() => <Icon name="spacing" />}>
        {(close) => LINE_HEIGHTS.map((lh) => (
          <button key={lh} type="button" className={`menu-item${settings.lineHeight === lh ? ' checked' : ''}`}
            onClick={() => { onSettingsChange({ lineHeight: lh }); close() }}>
            {lh}
          </button>
        ))}
      </Dropdown>

      <Dropdown title="Link" trigger={() => <Icon name="link" />}
        onOpenChange={(open) => { if (open) setLinkUrl(editor.getAttributes('link').href as string ?? '') }}>
        {(close) => (
          <form className="link-form" onSubmit={(e) => {
            e.preventDefault()
            const chain = editor.chain().focus().extendMarkRange('link')
            if (linkUrl.trim()) chain.setLink({ href: linkUrl.trim() }).run()
            else chain.unsetLink().run()
            close()
          }}>
            <input autoFocus placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <button type="submit" className="btn-small">Apply</button>
            {editor.isActive('link') && (
              <button type="button" className="btn-small" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); close() }}>
                Remove
              </button>
            )}
          </form>
        )}
      </Dropdown>
      <Sep />

      <Btn icon="listBullet" title={`Bulleted list (${mod}⇧8)`} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn icon="listOrdered" title={`Numbered list (${mod}⇧7)`} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn icon="listCheck" title={`Checklist (${mod}⇧9)`} active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <Sep />

      <Btn icon="sup" title={`Superscript (${mod}.)`} active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} />
      <Btn icon="sub" title={`Subscript (${mod},)`} active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} />

      <Dropdown title={`Highlight (${mod}⇧H)`} trigger={() => <Icon name="highlight" />}>
        {(close) => (
          <div className="swatch-row">
            {HIGHLIGHTS.map((c) => (
              <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Highlight ${c}`}
                onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); close() }} />
            ))}
            <button type="button" className="swatch swatch-none" aria-label="No highlight"
              onClick={() => { editor.chain().focus().unsetHighlight().run(); close() }}>
              <Icon name="close" size={12} />
            </button>
          </div>
        )}
      </Dropdown>

      <Dropdown title="Text color" trigger={() => <Icon name="textColor" />}>
        {(close) => (
          <div className="swatch-row">
            {TEXT_COLORS.map((c) => (
              <button key={c || 'default'} type="button"
                className={`swatch${c ? '' : ' swatch-none'}`}
                style={c ? { background: c } : undefined} aria-label={c ? `Color ${c}` : 'Default color'}
                onClick={() => {
                  const chain = editor.chain().focus()
                  if (c) chain.setColor(c).run()
                  else chain.unsetColor().run()
                  close()
                }}>
                {!c && <Icon name="close" size={12} />}
              </button>
            ))}
          </div>
        )}
      </Dropdown>
      <Sep />

      <Btn icon="search" title={`Find & replace (${mod}F)`} onClick={props.onToggleFind} />

      <Dropdown title="Export" trigger={() => <Icon name="download" />} align="right">
        {(close) => (
          <>
            <button type="button" className="menu-item" onClick={async () => {
              await navigator.clipboard.writeText(pmJsonToMarkdown(editor.getJSON()))
              close()
            }}>
              <Icon name="copy" /> Copy as Markdown
            </button>
            <button type="button" className="menu-item" onClick={() => {
              download(`${exportName}.md`, pmJsonToMarkdown(editor.getJSON()), 'text/markdown')
              close()
            }}>
              <Icon name="download" /> Download .md
            </button>
            <button type="button" className="menu-item" onClick={() => {
              download(`${exportName}.txt`, editor.getText(), 'text/plain')
              close()
            }}>
              <Icon name="download" /> Download .txt
            </button>
          </>
        )}
      </Dropdown>

      <span className="tb-spacer" />
      <Btn icon="zen" title={`Zen mode (${mod}\\)`} active={settings.zen} onClick={props.onToggleZen} />
      <Btn icon="gear" title="Settings" onClick={props.onOpenSettings} />
    </div>
  )
}
