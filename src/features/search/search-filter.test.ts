import { describe, expect, it } from 'vitest'
import { filterSearchResults } from './search-filter'

const results = [
  { id: 'react:hooks.md', source: 'react', path: 'hooks.md', title: 'Hooks', excerpt: 'useEffect reference', matchCount: 1, location: { line: 1, column: 1 }, matchIndex: 0 },
  { id: 'rust:book.html', source: 'rust', path: 'book.html', title: 'Ownership', excerpt: 'Borrowing reference', matchCount: 1, location: { line: 2, column: 1 }, matchIndex: 0 },
]

describe('filterSearchResults', () => {
  it('filters by source and document type', () => {
    expect(filterSearchResults(results, 'reference', { source: 'react', documentType: 'md', exact: false })).toHaveLength(1)
  })

  it('requires the complete query when exact matching is enabled', () => {
    expect(filterSearchResults(results, 'useEffect reference', { source: 'All', documentType: 'All', exact: true })).toHaveLength(1)
    expect(filterSearchResults(results, 'effect reference', { source: 'All', documentType: 'All', exact: true })).toHaveLength(0)
  })
})
