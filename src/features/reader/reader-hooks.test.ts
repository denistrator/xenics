import { describe, expect, it } from 'vitest'
import { toReaderDocument } from './reader-hooks'

describe('toReaderDocument', () => {
  it('maps the safe native model and warnings without rendering raw HTML', () => {
    const document = toReaderDocument(
      {
        path: 'README.md',
        blocks: [{ type: 'paragraph', text: '<script>alert(1)</script>', location: { line: 1, column: 1 } }],
        links: [],
        warnings: [{ code: 'unsafeHtml', message: 'unsafe HTML was omitted', location: { line: 1, column: 1 } }],
      },
      { sourceId: 'react', refName: 'main', path: 'README.md', title: 'React' },
    )

    expect(document.blocks).toEqual([
      { type: 'paragraph', text: '<script>alert(1)</script>', location: { line: 1, column: 1 } },
      { type: 'warning', text: 'unsafe HTML was omitted' },
    ])
    expect(document.source).toBe('react · main')
  })

  it('preserves native block locations for exact reader navigation', () => {
    const document = toReaderDocument({ path: 'README.md', blocks: [{ type: 'heading', text: 'Install', level: 2, location: { line: 8, column: 1 } }], links: [], warnings: [] }, { sourceId: 'react', refName: 'main', path: 'README.md', title: 'React' })
    expect(document.blocks[0]).toMatchObject({ location: { line: 8, column: 1 } })
  })

  it('preserves inline spans and tables from the safe native document model', () => {
    const document = toReaderDocument({
      path: 'README.md',
      blocks: [
        {
          type: 'paragraph',
          text: 'Read more',
          inline: [{ type: 'link', target: './guide.md', children: [{ type: 'text', text: 'Read more' }] }],
          location: { line: 1, column: 1 },
        },
        {
          type: 'table',
          text: 'Feature Support Tables Ready',
          headers: [[{ type: 'text', text: 'Feature' }], [{ type: 'text', text: 'Support' }]],
          rows: [[[{ type: 'text', text: 'Tables' }], [{ type: 'strong', children: [{ type: 'text', text: 'Ready' }] }]]],
          location: { line: 3, column: 1 },
        },
      ],
      links: [],
      warnings: [],
    }, { sourceId: 'react', refName: 'main', path: 'README.md', title: 'React' })

    expect(document.blocks[0]).toMatchObject({
      type: 'paragraph',
      inline: [{ type: 'link', target: './guide.md' }],
    })
    expect(document.blocks[1]).toMatchObject({ type: 'table' })
    const table = document.blocks[1]
    expect(table?.headers?.[0]?.[0]).toMatchObject({ text: 'Feature' })
    expect(table?.rows?.[0]?.[0]?.[0]).toMatchObject({ text: 'Tables' })
  })
})
