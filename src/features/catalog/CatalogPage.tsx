import { Download, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repositories, type Repository } from './catalog-model'
import { RepositoryCard } from './RepositoryCard'
import { defaultDownloadSelection, selectRange, toggleSelection } from './catalog-selection'
import { SourceDetails } from './SourceDetails'
import { hasNativeBridge, invokeCommand } from '../../lib/tauri'

type DownloadState = 'idle' | 'loading' | 'success' | 'error'

type CatalogPageProps = {
  onDownload?: (repositoryIds: string[]) => Promise<void> | void
  onUpdate?: (repositoryId: string) => Promise<void> | void
  onRemove?: (repositoryId: string) => Promise<void> | void
  onAddLocalSource?: (input: { id: string; displayName: string; path: string }) => Promise<Repository> | Repository
  onOpenFolder?: (repositoryId: string) => Promise<void> | void
  onOpenWebsite?: (repositoryId: string) => Promise<void> | void
}

function matchesRepositoryQuery(
  repository: Repository,
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

export function CatalogPage({ onDownload, onUpdate, onRemove, onAddLocalSource, onOpenFolder, onOpenWebsite }: CatalogPageProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [detailsRepositoryId, setDetailsRepositoryId] = useState<string | null>(null)
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => new Set())
  const [updateState, setUpdateState] = useState<DownloadState>('idle')
  const [customRepositories, setCustomRepositories] = useState<Repository[]>([])
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [sourceName, setSourceName] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [sourceError, setSourceError] = useState<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    void invokeCommand<Array<{ id: string }>>('list_sources')
      .then((sources) => {
        if (active) setInstalledIds(new Set(sources.map(({ id }) => id)))
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  const catalogRepositories = useMemo(
    () => [...repositories, ...customRepositories].map((repository) => ({
      ...repository,
      status: installedIds.has(repository.id) ? 'Ready' as const : repository.status,
    })),
    [customRepositories, installedIds],
  )

  const visibleRepositories = useMemo(
    () => catalogRepositories.filter((repository) => matchesRepositoryQuery(repository, deferredSearchQuery)),
    [catalogRepositories, deferredSearchQuery],
  )
  const selectedRepositoryIds = useMemo(() => new Set(selectedIds), [selectedIds])
  const downloadableRepositoryIds = useMemo(
    () => defaultDownloadSelection(catalogRepositories),
    [catalogRepositories],
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
      setInstalledIds((current) => new Set([...current, ...repositoryIds]))
      setDownloadState('success')
    } catch {
      setDownloadState('error')
    }
  }

  async function updateRepositories(repositoryIds: string[]): Promise<void> {
    if (updateState === 'loading' || repositoryIds.length === 0 || !onUpdate) return
    setUpdateState('loading')
    try {
      await Promise.all(repositoryIds.map((repositoryId) => onUpdate(repositoryId)))
      setUpdateState('success')
    } catch {
      setUpdateState('error')
    }
  }

  async function removeRepository(repositoryId: string): Promise<void> {
    if (!onRemove) return
    try {
      await onRemove(repositoryId)
      setInstalledIds((current) => {
        const next = new Set(current)
        next.delete(repositoryId)
        return next
      })
    } catch {
      setUpdateState('error')
    }
  }

  async function addLocalSource(): Promise<void> {
    const displayName = sourceName.trim()
    const path = sourcePath.trim()
    if (!displayName || !path || !onAddLocalSource) {
      setSourceError('Enter a name and a local folder path.')
      return
    }
    setSourceError(null)
    try {
      const id = `local-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const repository = await onAddLocalSource({ id, displayName, path })
      setCustomRepositories((current) => [...current.filter(({ id: currentId }) => currentId !== repository.id), repository])
      setInstalledIds((current) => new Set([...current, repository.id]))
      setSourceName('')
      setSourcePath('')
      setAddSourceOpen(false)
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'The source could not be added.')
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
    : catalogRepositories.find(({ id }) => id === detailsRepositoryId)

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
          {onAddLocalSource && (
            <button type="button" onClick={() => setAddSourceOpen(true)} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">
              Add local source
            </button>
          )}
          {installedIds.size > 0 && onUpdate && (
            <button
              type="button"
              onClick={() => void updateRepositories([...installedIds])}
              disabled={updateState === 'loading'}
              aria-busy={updateState === 'loading'}
              className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper"
            >
              <RefreshCw aria-hidden="true" className="mr-2 inline" size={16} />
              {updateState === 'loading' ? 'Updating all…' : updateState === 'success' ? 'All sources updated' : updateState === 'error' ? 'Update failed — retry' : 'Update all'}
            </button>
          )}
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
              onUpdate={onUpdate ? () => void updateRepositories([repository.id]) : undefined}
              onRemove={onRemove ? () => void removeRepository(repository.id) : undefined}
              onOpenFolder={onOpenFolder ? () => void onOpenFolder(repository.id) : undefined}
              onOpenWebsite={onOpenWebsite ? () => void onOpenWebsite(repository.id) : undefined}
            />
          ))}
        </div>
      )}
      {detailsRepository && <SourceDetails repository={detailsRepository} onClose={() => setDetailsRepositoryId(null)} />}
      {addSourceOpen && onAddLocalSource && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-x-ink/30 p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="add-source-title" className="w-full max-w-lg rounded-2xl border border-x-line bg-x-panel p-6 shadow-2xl">
            <h2 id="add-source-title" className="font-display text-2xl tracking-tight">Add local source</h2>
            <p className="mt-2 text-sm text-x-muted">The folder stays in its current location. Xenics will make it available as a Files-only source.</p>
            <div className="mt-5 space-y-4">
              <label className="block space-y-2 text-sm"><span className="font-semibold">Name</span><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2" /></label>
              <label className="block space-y-2 text-sm"><span className="font-semibold">Folder path</span><input value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="/Users/you/docs" className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2" /></label>
              {sourceError && <p role="alert" className="text-sm text-x-coral">{sourceError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setAddSourceOpen(false)} className="rounded-lg border border-x-line px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => void addLocalSource()} className="rounded-lg bg-x-ink px-4 py-2 text-sm font-semibold text-x-paper">Add source</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
