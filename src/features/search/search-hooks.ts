import { useMemo, useState } from 'react'
import type { SearchResultModel } from './search-state'

export function useCatalogSearch(results: SearchResultModel[]) {
  const [query, setQuery] = useState('')
  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return results
    return results.filter((result) => `${result.title} ${result.excerpt} ${result.path}`.toLowerCase().includes(normalizedQuery))
  }, [query, results])

  return { query, setQuery, results: filteredResults }
}
