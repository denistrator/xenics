import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { SearchReaderTarget, SearchResponse } from './search-state'
import { coverageMessage } from './search-state'
import type { ReactNode } from 'react'
import { SearchResult } from './SearchResult'
import { filterSearchResults, type SearchFilters } from './search-filter'
import { VirtualizedList } from '../../components/performance/VirtualizedList'

type SearchPageProps = {
  response: SearchResponse
  onOpen: (target: SearchReaderTarget) => void
  query: string
  onQueryChange: (query: string) => void
  categoryBySource?: Record<string, string>
}

export function SearchPage({ response, onOpen, query, onQueryChange, categoryBySource = {} }: SearchPageProps): ReactNode {
  const indexingMessage = coverageMessage(response.coverage)
  const hasResults = response.results.length > 0
  const [filters, setFilters] = useState<SearchFilters>({ source: 'All', documentType: 'All', category: 'All', exact: false })
  const [focusedResultIndex, setFocusedResultIndex] = useState(0)
  const sources = useMemo(() => ['All', ...new Set(response.results.map((result) => result.source))], [response.results])
  const documentTypes = useMemo(() => ['All', ...new Set(response.results.map((result) => result.path.split('.').pop()?.toLowerCase() ?? 'other'))], [response.results])
  const categories = useMemo(() => ['All', ...new Set(response.results.map((result) => categoryBySource[result.source] ?? 'Custom'))], [response.results, categoryBySource])
  const filteredResults = useMemo(() => filterSearchResults(response.results, response.query, filters, categoryBySource), [response.results, response.query, filters, categoryBySource])
  const showResults = !response.error && !indexingMessage && filteredResults.length > 0
  const showEmptyState = !response.error && !indexingMessage && filteredResults.length === 0

  useEffect(() => setFocusedResultIndex(0), [filters, response.query])

  function focusResult(direction: -1 | 1): void {
    if (filteredResults.length === 0) return
    const nextIndex = (focusedResultIndex + direction + filteredResults.length) % filteredResults.length
    setFocusedResultIndex(nextIndex)
    window.requestAnimationFrame(() => globalThis.document.querySelector<HTMLAnchorElement>(`a[href="#reader-${encodeURIComponent(filteredResults[nextIndex]?.id ?? '')}"]`)?.focus())
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Library search</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Find the exact page.</h1>
        <label className="mt-6 flex items-center gap-3 rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm">
          <Search aria-hidden="true" className="text-x-muted" size={17} />
          <span className="sr-only">Search query</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
      </header>

      {hasResults && <div className="flex flex-wrap items-end gap-3 rounded-xl border border-x-line bg-x-panel p-4">
        <label className="text-xs font-semibold">Repository<select aria-label="Filter search by repository" value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className="mt-1 block rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm">{sources.map((source) => <option key={source}>{source}</option>)}</select></label>
        <label className="text-xs font-semibold">Document type<select aria-label="Filter search by document type" value={filters.documentType} onChange={(event) => setFilters((current) => ({ ...current, documentType: event.target.value }))} className="mt-1 block rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm">{documentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="text-xs font-semibold">Category<select aria-label="Filter search by category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="mt-1 block rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="flex items-center gap-2 pb-2 text-xs font-semibold"><input type="checkbox" checked={filters.exact} onChange={(event) => setFilters((current) => ({ ...current, exact: event.target.checked }))} />Exact match</label>
        <div className="ml-auto flex gap-1"><button type="button" aria-label="Previous exact match" onClick={() => focusResult(-1)} className="rounded-md p-2 text-x-muted hover:bg-x-paper"><ChevronLeft aria-hidden="true" size={16} /></button><button type="button" aria-label="Next exact match" onClick={() => focusResult(1)} className="rounded-md p-2 text-x-muted hover:bg-x-paper"><ChevronRight aria-hidden="true" size={16} /></button></div>
      </div>}

      {response.error && (
        <p role="alert" className="rounded-xl border border-x-coral/40 bg-x-coral/10 p-4 text-sm">
          {response.error}
        </p>
      )}

      {!response.error && indexingMessage && (
        <p className="rounded-xl border border-x-amber/40 bg-x-amber/10 p-4 text-sm">
          {indexingMessage}. Results will improve as sources finish indexing.
        </p>
      )}

      {showEmptyState && (
        <p className="rounded-xl border border-dashed border-x-line bg-x-panel p-8 text-center text-sm text-x-muted">
          No results
        </p>
      )}

      {showResults && (
        <VirtualizedList
          items={filteredResults}
          estimateSize={120}
          renderItem={(result) => <SearchResult key={result.id} result={result} query={response.query} onOpen={onOpen} />}
        />
      )}
    </section>
  )
}
