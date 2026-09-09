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
      { type: 'paragraph', text: '<script>alert(1)</script>' },
      { type: 'warning', text: 'unsafe HTML was omitted' },
    ])
    expect(document.source).toBe('react · main')
  })
})
