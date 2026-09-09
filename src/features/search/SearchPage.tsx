import { Search } from 'lucide-react'
import type { SearchResponse } from './search-state'
import { coverageMessage } from './search-state'
import { SearchResult } from './SearchResult'

type SearchPageProps = { response: SearchResponse; onOpen: (target: unknown) => void }

export function SearchPage({ response, onOpen }: SearchPageProps) {
  const indexingMessage = coverageMessage(response.coverage)

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Library search</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Find the exact page.</h1>
        <label className="mt-6 flex items-center gap-3 rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm">
          <Search size={17} className="text-x-muted" />
          <span className="sr-only">Search query</span>
          <input value={response.query} readOnly className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
      </header>

      {response.error && <p role="alert" className="rounded-xl border border-x-coral/40 bg-x-coral/10 p-4 text-sm">{response.error}</p>}
      {!response.error && indexingMessage && <p className="rounded-xl border border-x-amber/40 bg-x-amber/10 p-4 text-sm">{indexingMessage}. Results will improve as sources finish indexing.</p>}
      {!response.error && !indexingMessage && response.results.length === 0 && <p className="p-8 text-center text-sm text-x-muted">No results</p>}
      {!response.error && !indexingMessage && response.results.length > 0 && <div className="space-y-3">{response.results.map((result) => <SearchResult key={result.id} result={result} onOpen={onOpen} />)}</div>}
    </section>
  )
}
