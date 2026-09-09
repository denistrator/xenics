import { Download, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { repositories } from './catalog-model'
import { RepositoryCard } from './RepositoryCard'
import { selectRange, toggleSelection } from './catalog-selection'

export function CatalogPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'success'>('idle')

  function handleSelect(repoId: string, index: number, shiftKey: boolean) {
    const nextSelection = shiftKey && selectionAnchor !== null
      ? [...new Set([...selectedIds, ...selectRange(repositories, selectionAnchor, index)])]
      : toggleSelection(selectedIds, repoId)

    setSelectedIds(nextSelection)
    setSelectionAnchor(index)
  }

  const downloadLabel = selectedIds.length
    ? `Download selected (${selectedIds.length})`
    : 'Download all'

  function handleDownload() {
    setDownloadState('loading')
    window.setTimeout(() => setDownloadState('success'), 500)
  }

  return (
    <div id="catalog" className="space-y-9">
      <section className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">
            Your offline shelf
          </p>
          <h1 className="max-w-3xl font-display text-4xl leading-[.98] tracking-[-.04em] md:text-6xl">
            The tools you build with, <span className="font-semibold text-x-mint-strong">close at hand.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-x-muted">
            A calm home for the documentation you reach for every day. Download a source once,
            then read and search it anywhere.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === 'loading'}
            aria-busy={downloadState === 'loading'}
            data-state={downloadState}
            className="rounded-xl bg-x-ink px-4 py-3 text-sm font-semibold text-x-paper hover:opacity-90"
          >
            <Download className="mr-2 inline" size={16} />
            {downloadState === 'loading' ? 'Preparing downloads…' : downloadState === 'success' ? 'Downloads queued' : downloadLabel}
          </button>
          <button
            aria-label="Filter repositories"
            className="grid size-11 place-items-center rounded-xl border border-x-line bg-x-panel text-x-muted hover:bg-x-paper"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-y border-x-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex max-w-md flex-1 items-center gap-3 rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm text-x-muted">
          <Search size={17} />
          <span className="sr-only">Search repositories</span>
          <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-x-muted" placeholder="Search your catalog" />
        </label>
        <div className="flex gap-2 text-xs font-semibold text-x-muted">
          <span className="rounded-full bg-x-mint px-3 py-2 text-x-ink">All sources</span>
          <span className="rounded-full px-3 py-2">{repositories.length} technologies</span>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {repositories.map((repo, index) => (
          <RepositoryCard
            key={repo.id}
            repo={repo}
            featured={index === 0}
            selected={selectedIds.includes(repo.id)}
            onSelect={(shiftKey) => handleSelect(repo.id, index, shiftKey)}
            onOpen={() => undefined}
          />
        ))}
      </div>
    </div>
  )
}
