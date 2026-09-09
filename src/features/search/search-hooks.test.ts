import { describe, expect, it } from 'vitest'
import { mapSearchHits } from './search-hooks'

describe('mapSearchHits', () => {
  it('creates stable reader-ready results from native search hits', () => {
    expect(mapSearchHits([
      {
        sourceId: 'react',
        path: 'hooks/use-effect.md',
        title: 'useEffect',
        snippet: 'Synchronize a component with an external system.',
        rank: -4.2,
      },
    ])).toEqual([{
      id: 'react:hooks/use-effect.md',
      title: 'useEffect',
      source: 'react',
      path: 'hooks/use-effect.md',
      excerpt: 'Synchronize a component with an external system.',
      matchCount: 1,
      location: { line: 1, column: 1 },
      matchIndex: 0,
    }])
  })
})
