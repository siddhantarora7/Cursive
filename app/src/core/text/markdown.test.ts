import { describe, expect, it } from 'vitest'
import { pmJsonToMarkdown } from './markdown'

const p = (text: string, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>) => ({
  type: 'paragraph',
  content: [{ type: 'text', text, ...(marks ? { marks } : {}) }],
})

describe('pmJsonToMarkdown', () => {
  it('renders paragraphs, headings, marks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        p('plain'),
        p('bold', [{ type: 'bold' }]),
        p('linked', [{ type: 'link', attrs: { href: 'https://x.dev' } }]),
      ],
    }
    expect(pmJsonToMarkdown(doc)).toBe(
      '## Title\n\nplain\n\n**bold**\n\n[linked](https://x.dev)\n',
    )
  })

  it('renders lists including task lists', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [p('one')] },
            { type: 'listItem', content: [p('two')] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [p('done')] },
            { type: 'taskItem', attrs: { checked: false }, content: [p('todo')] },
          ],
        },
      ],
    }
    expect(pmJsonToMarkdown(doc)).toBe('- one\n- two\n\n- [x] done\n- [ ] todo\n')
  })

  it('renders code blocks and blockquotes', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const x = 1' }],
        },
        { type: 'blockquote', content: [p('quoted')] },
      ],
    }
    expect(pmJsonToMarkdown(doc)).toBe('```ts\nconst x = 1\n```\n\n> quoted\n')
  })

  it('handles empty docs', () => {
    expect(pmJsonToMarkdown({ type: 'doc', content: [] })).toBe('\n')
    expect(pmJsonToMarkdown(null)).toBe('')
  })
})
