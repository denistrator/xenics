import { Command, Search } from 'lucide-react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type { SearchResultModel } from './search-state'

type SearchPaletteProps = {
  open: boolean
  query: string
  results: SearchResultModel[]
  isSearching?: boolean
  error?: string
  onQueryChange: (query: string) => void
  onSelect: (result: SearchResultModel) => void
  onClose: () => void
}

export function SearchPalette({
  open,
  query,
  results,
  isSearching = false,
  error,
  onQueryChange,
  onSelect,
  onClose,
}: SearchPaletteProps): ReactNode {
  if (!open) return null

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.currentTarget === event.target) onClose()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-x-ink/30 p-4 backdrop-blur-sm md:p-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-palette-title"
      onClick={handleBackdropClick}
    >
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-x-line bg-x-panel shadow-2xl">
        <h2 id="search-palette-title" className="sr-only">Search documentation</h2>
        <div className="flex items-center gap-3 border-b border-x-line px-5 py-4">
          <Search aria-hidden="true" className="text-x-muted" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search documentation"
            aria-label="Search documentation"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="flex items-center gap-1 text-xs text-x-muted" aria-hidden="true">
            <Command size={13} /> K
          </span>
        </div>

        {error ? (
          <p role="alert" className="p-8 text-center text-sm text-x-coral">{error}</p>
        ) : isSearching ? (
          <p role="status" className="p-8 text-center text-sm text-x-muted">Searching…</p>
        ) : results.length > 0 ? (
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto p-2">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => onSelect(result)}
                className="block w-full rounded-xl px-4 py-3 text-left hover:bg-x-paper"
              >
                <p className="font-semibold">{result.title}</p>
                <p className="mt-1 text-xs text-x-muted">{result.source} · {result.path}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-x-muted">No matching documentation.</p>
        )}
      </div>
    </div>
  )
}
