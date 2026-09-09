import { ArrowUpRight, FileText } from 'lucide-react'
import type { SearchResultModel } from './search-state'
import { openSearchResult } from './search-state'

type SearchResultProps = { result: SearchResultModel; onOpen: (target: ReturnType<typeof openSearchResult>) => void }

export function SearchResult({ result, onOpen }: SearchResultProps) {
  return (
    <article className="rounded-2xl border border-x-line bg-x-panel p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--x-shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-x-muted"><FileText size={14} /> {result.source} · {result.path}</p>
          <a href={`#reader-${result.id}`} onClick={(event) => { event.preventDefault(); onOpen(openSearchResult(result)) }} className="mt-2 block text-lg font-semibold tracking-tight hover:text-x-mint-strong">{result.title}</a>
        </div>
        <ArrowUpRight size={17} className="shrink-0 text-x-muted" />
      </div>
      <p className="mt-3 text-sm leading-6 text-x-muted">{result.excerpt}</p>
      <p className="mt-4 text-xs font-semibold text-x-muted">{result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'} · line {result.location.line}</p>
    </article>
  )
}
