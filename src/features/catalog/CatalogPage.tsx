import { Download, Search, SlidersHorizontal } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { repositories } from './catalog-model'
import { RepositoryCard } from './RepositoryCard'
import { defaultDownloadSelection, selectRange, toggleSelection } from './catalog-selection'
import { SourceDetails } from './SourceDetails'

type DownloadState = 'idle' | 'loading' | 'success' | 'error'

type CatalogPageProps = {
  onDownload?: (repositoryIds: string[]) => Promise<void> | void
}

function matchesRepositoryQuery(
  repository: (typeof repositories)[number],
  query: string,
): boolean {
  const searchableText = [
    repository.name,
    repository.vendor,
    repository.description,
    repository.category,
    repository.capability,
  ].join(' ')

  return searchableText.toLowerCase().includes(query)
}

export function CatalogPage({ onDownload }: CatalogPageProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [detailsRepositoryId, setDetailsRepositoryId] = useState<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  const visibleRepositories = useMemo(
    () => repositories.filter((repository) => matchesRepositoryQuery(repository, deferredSearchQuery)),
    [deferredSearchQuery],
  )
  const selectedRepositoryIds = useMemo(() => new Set(selectedIds), [selectedIds])
  const downloadableRepositoryIds = useMemo(
    () => defaultDownloadSelection(repositories),
    [],
  )

  function handleSelect(repositoryId: string, shiftKey: boolean): void {
    const currentIndex = visibleRepositories.findIndex(({ id }) => id === repositoryId)
    const anchorIndex = selectionAnchorId === null
      ? -1
      : visibleRepositories.findIndex(({ id }) => id === selectionAnchorId)

    const nextSelection = shiftKey && anchorIndex >= 0
      ? [...new Set([
        ...selectedIds,
        ...selectRange(visibleRepositories, anchorIndex, currentIndex),
      ])]
      : toggleSelection(selectedIds, repositoryId)

    setSelectedIds(nextSelection)
    setSelectionAnchorId(repositoryId)
  }

  async function startDownload(repositoryIds: string[]): Promise<void> {
    if (downloadState === 'loading' || repositoryIds.length === 0) return

    setDownloadState('loading')

    try {
      if (!onDownload) {
        throw new Error('Repository download is unavailable in this environment')
      }
      await onDownload(repositoryIds)
      setDownloadState('success')
    } catch {
      setDownloadState('error')
    }
  }

  const downloadLabel = selectedIds.length
    ? `Download selected (${selectedIds.length})`
    : 'Download all'
  const downloadButtonLabel = {
    idle: downloadLabel,
    loading: 'Preparing downloads…',
    success: 'Downloads queued',
    error: 'Download failed — retry',
  }[downloadState]
  const detailsRepository = detailsRepositoryId === null
    ? undefined
    : repositories.find(({ id }) => id === detailsRepositoryId)

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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void startDownload(selectedIds.length ? selectedIds : downloadableRepositoryIds)}
            disabled={downloadState === 'loading' || downloadableRepositoryIds.length === 0}
            aria-busy={downloadState === 'loading'}
            data-state={downloadState}
            className="rounded-xl bg-x-ink px-4 py-3 text-sm font-semibold text-x-paper hover:opacity-90"
          >
            <Download aria-hidden="true" className="mr-2 inline" size={16} />
            {downloadButtonLabel}
          </button>
          <button
            type="button"
            aria-label="Filter repositories"
            className="grid size-11 place-items-center rounded-xl border border-x-line bg-x-panel text-x-muted hover:bg-x-paper"
          >
            <SlidersHorizontal aria-hidden="true" size={17} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-y border-x-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex max-w-md flex-1 items-center gap-3 rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm text-x-muted">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search repositories</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-x-muted"
            placeholder="Search your catalog"
          />
        </label>
        <div className="flex gap-2 text-xs font-semibold text-x-muted">
          <span className="rounded-full bg-x-mint px-3 py-2 text-x-ink">All sources</span>
          <span className="rounded-full px-3 py-2">
            {visibleRepositories.length} {visibleRepositories.length === 1 ? 'technology' : 'technologies'}
          </span>
        </div>
      </section>

      {visibleRepositories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-x-line bg-x-panel p-10 text-center text-sm text-x-muted">
          No repositories match “{searchQuery}”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRepositories.map((repository, index) => (
            <RepositoryCard
              key={repository.id}
              repo={repository}
              featured={index === 0 && deferredSearchQuery === ''}
              selected={selectedRepositoryIds.has(repository.id)}
              onSelect={(shiftKey) => handleSelect(repository.id, shiftKey)}
              onOpen={() => setDetailsRepositoryId(repository.id)}
              onDownload={() => void startDownload([repository.id])}
            />
          ))}
        </div>
      )}
      {detailsRepository && <SourceDetails repository={detailsRepository} onClose={() => setDetailsRepositoryId(null)} />}
    </div>
  )
}
