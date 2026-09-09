import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { invokeCommand } from '../../lib/tauri'
import type { SearchResponse, SearchResultModel } from './search-state'

export type NativeSearchHit = {
  sourceId: string
  path: string
  title: string
  snippet: string
  rank: number
}

export function mapSearchHits(hits: NativeSearchHit[]): SearchResultModel[] {
  return hits.map((hit) => ({
    id: `${hit.sourceId}:${hit.path}`,
    title: hit.title || hit.path,
    source: hit.sourceId,
    path: hit.path,
    excerpt: hit.snippet,
    matchCount: 1,
    location: { line: 1, column: 1 },
    matchIndex: 0,
  }))
}

export function useNativeSearch() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<SearchResponse>({
    query: '', results: [], coverage: { complete: true, indexed: 0, total: 0 },
  })
  const deferredQuery = useDeferredValue(query.trim())

  useEffect(() => {
    if (!deferredQuery) {
      setResponse({ query, results: [], coverage: { complete: true, indexed: 0, total: 0 } })
      return
    }

    let disposed = false
    void invokeCommand<NativeSearchHit[]>('search_documents', { query: deferredQuery })
      .then((hits) => {
        if (!disposed) setResponse({
          query,
          results: mapSearchHits(hits),
          coverage: { complete: true, indexed: hits.length, total: hits.length },
        })
      })
      .catch((error: unknown) => {
        if (!disposed) setResponse({
          query,
          results: [],
          coverage: { complete: true, indexed: 0, total: 0 },
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => { disposed = true }
  }, [deferredQuery])

  return { query, setQuery, response, isSearching: deferredQuery !== query.trim() }
}

function matchesQuery(result: SearchResultModel, query: string): boolean {
  return [result.title, result.excerpt, result.path, result.source]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

export function useSearchResults(results: SearchResultModel[]) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const deferredQuery = useDeferredValue(normalizedQuery)
  const filteredResults = useMemo(
    () => results.filter((result) => matchesQuery(result, deferredQuery)),
    [deferredQuery, results],
  )

  return { query, setQuery, results: filteredResults, isFiltering: normalizedQuery !== deferredQuery }
}
