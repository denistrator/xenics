import { ArrowUpRight, FileText } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import type { SearchReaderTarget, SearchResultModel } from './search-state'
import { openSearchResult } from './search-state'

type SearchResultProps = {
  result: SearchResultModel
  query?: string
  onOpen: (target: SearchReaderTarget) => void
}

function highlightText(text: string, query: string): ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return text
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i')
  return text.split(pattern).map((part, index) => pattern.test(part) ? <mark key={`${part}-${index}`} className="rounded bg-x-amber/50 text-x-ink">{part}</mark> : <span key={`${part}-${index}`}>{part}</span>)
}

export function SearchResult({ result, query = '', onOpen }: SearchResultProps): ReactNode {
  const resultHash = `#reader-${encodeURIComponent(result.id)}`
  const matchLabel = result.matchCount === 1 ? 'match' : 'matches'

  function handleOpen(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault()
    onOpen(openSearchResult(result))
  }

  return (
    <article className="rounded-2xl border border-x-line bg-x-panel p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--x-shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-x-muted">
            <FileText aria-hidden="true" size={14} />
            {result.source} · {result.path}
          </p>
          <a
            href={resultHash}
            onClick={handleOpen}
            className="mt-2 block text-lg font-semibold tracking-tight hover:text-x-mint-strong"
          >
            {highlightText(result.title, query)}
          </a>
        </div>
        <ArrowUpRight aria-hidden="true" className="shrink-0 text-x-muted" size={17} />
      </div>
      <p className="mt-3 text-sm leading-6 text-x-muted">{highlightText(result.excerpt, query)}</p>
      <p className="mt-4 text-xs font-semibold text-x-muted">
        {result.matchCount} {matchLabel} · line {result.location.line}
      </p>
    </article>
  )
}
