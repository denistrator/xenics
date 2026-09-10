import type { SearchResultModel } from './search-state'

export type SearchFilters = {
  source: string
  documentType: string
  exact: boolean
}

export function filterSearchResults(results: SearchResultModel[], query: string, filters: SearchFilters): SearchResultModel[] {
  const normalizedQuery = query.trim().toLowerCase()
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  return results.filter((result) => {
    const documentType = result.path.split('.').pop()?.toLowerCase() ?? 'other'
    const searchableText = [result.title, result.excerpt, result.path].join(' ').toLowerCase()
    const exactPattern = normalizedQuery
      ? new RegExp(`\\b${normalizedQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i')
      : null
    return (filters.source === 'All' || result.source === filters.source)
      && (filters.documentType === 'All' || documentType === filters.documentType)
      && (!filters.exact || exactPattern?.test(searchableText) === true)
      && terms.every((term) => searchableText.includes(term))
  })
}
