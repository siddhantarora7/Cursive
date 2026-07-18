/**
 * TipTap/ProseMirror JSON → Markdown. Pure TS; covers exactly the Phase 1
 * schema (StarterKit + task lists + highlight). Unknown nodes degrade to
 * their text content rather than being dropped.
 */

interface JsonNode {
  type?: string
  text?: string
  content?: JsonNode[]
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export function pmJsonToMarkdown(doc: unknown): string {
  const root = doc as JsonNode
  if (!root || !Array.isArray(root.content)) return ''
  return root.content.map((n) => block(n, '')).join('\n\n').trimEnd() + '\n'
}

function block(node: JsonNode, indent: string): string {
  switch (node.type) {
    case 'paragraph':
      return indent + inline(node.content)
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6)
      return indent + '#'.repeat(level) + ' ' + inline(node.content)
    }
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => block(child, indent))
        .join('\n\n')
        .split('\n')
        .map((line) => '> ' + line)
        .join('\n')
    case 'codeBlock': {
      const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : ''
      const code = (node.content ?? []).map((c) => c.text ?? '').join('')
      return indent + '```' + lang + '\n' + code + '\n```'
    }
    case 'bulletList':
      return list(node, indent, () => '- ')
    case 'orderedList': {
      const start = Number(node.attrs?.start ?? 1)
      return list(node, indent, (i) => `${start + i}. `)
    }
    case 'taskList':
      return list(node, indent, (_, item) =>
        item.attrs?.checked === true ? '- [x] ' : '- [ ] ',
      )
    case 'horizontalRule':
      return indent + '---'
    default:
      return indent + inline(node.content)
  }
}

function list(node: JsonNode, indent: string, marker: (i: number, item: JsonNode) => string): string {
  return (node.content ?? [])
    .map((item, i) => {
      const m = marker(i, item)
      const inner = (item.content ?? [])
        .map((child) => block(child, ''))
        .join('\n\n' + indent + ' '.repeat(m.length))
      return indent + m + inner
    })
    .join('\n')
}

function inline(content: JsonNode[] | undefined): string {
  if (!content) return ''
  return content
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n'
      if (node.type !== 'text' || node.text === undefined) return inline(node.content)
      let text = node.text
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`
            break
          case 'italic':
            text = `*${text}*`
            break
          case 'strike':
            text = `~~${text}~~`
            break
          case 'code':
            text = `\`${text}\``
            break
          case 'highlight':
            text = `==${text}==`
            break
          case 'link': {
            const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
            text = `[${text}](${href})`
            break
          }
        }
      }
      return text
    })
    .join('')
}
