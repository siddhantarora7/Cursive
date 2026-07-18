import { useState } from 'react'
import type { DocRecord } from '../store/db'
import { Dropdown } from './Dropdown'
import { Icon } from './icons'

export function DocsPopover({
  docs,
  activeId,
  title,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: {
  docs: DocRecord[]
  activeId: string | null
  title: string
  onSwitch: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <Dropdown
      title="Documents"
      trigger={() => (
        <span className="doc-title">
          <Icon name="file" size={14} />
          <span className="doc-title-text">{title}</span>
          <Icon name="chevron" size={12} />
        </span>
      )}
    >
      {(close) => (
        <div className="docs-list">
          <button type="button" className="menu-item" onClick={() => { onCreate(); close() }}>
            <Icon name="plus" /> New document
          </button>
          <div className="docs-divider" />
          {docs.map((doc) => (
            <div key={doc.id} className={`docs-row${doc.id === activeId ? ' current' : ''}`}>
              {renaming === doc.id ? (
                <form
                  className="docs-rename"
                  onSubmit={(e) => {
                    e.preventDefault()
                    onRename(doc.id, draft.trim() || 'Untitled')
                    setRenaming(null)
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => setRenaming(null)}
                  />
                </form>
              ) : (
                <>
                  <button type="button" className="docs-open" onClick={() => { onSwitch(doc.id); close() }}>
                    <span className="docs-name">{doc.title}</span>
                    <span className="docs-meta">
                      {doc.wordCount} words · {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button type="button" className="docs-action" title="Rename"
                    onClick={() => { setRenaming(doc.id); setDraft(doc.title) }}>
                    ✎
                  </button>
                  {confirming === doc.id ? (
                    <button type="button" className="docs-action danger" title="Really delete?"
                      onClick={() => { onDelete(doc.id); setConfirming(null) }}>
                      sure?
                    </button>
                  ) : (
                    <button type="button" className="docs-action" title="Delete"
                      onClick={() => setConfirming(doc.id)}>
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Dropdown>
  )
}
