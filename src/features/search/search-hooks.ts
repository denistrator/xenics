import { useDeferredValue, useMemo, useState } from 'react'
import type { SearchResultModel } from './search-state'

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
