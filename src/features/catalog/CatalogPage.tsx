import { Download, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { repositories, type Repository, type RepositoryMetadataOverride } from './catalog-model'
import { getGroupRepositories, technologyGroups } from './catalog-groups'
import { applyNativeSourceMetadata, nativeSourceToRepository, resolveCatalogStatus, type NativeSourceMetadata } from './catalog-source-metadata'
import { RepositoryCard } from './RepositoryCard'
import { TechnologyGroupCard } from './TechnologyGroupCard'
import { defaultDownloadSelection, selectRange, toggleSelection } from './catalog-selection'
import { SourceDetails } from './SourceDetails'
import { hasNativeBridge, invokeCommand } from '../../lib/tauri'
import { VirtualizedGrid } from '../../components/performance/VirtualizedGrid'

type UpdateAvailabilityReport = {
  sourceId: string
  availability: 'available' | 'up-to-date' | 'unknown'
  checkedAt: number
}

type DownloadState = 'idle' | 'loading' | 'success' | 'error'

type CatalogPageProps = {
  onDownload?: (repositoryIds: string[]) => Promise<void> | void
  onUpdate?: (repositoryId: string) => Promise<void> | void
  onRemove?: (repositoryId: string) => Promise<void> | void
  onAddLocalSource?: (input: { id: string; displayName: string; path: string }) => Promise<Repository> | Repository
  onAddRemoteSource?: (input: { id: string; displayName: string; source: string; selectedRef: string }) => Promise<Repository> | Repository
  onOpenFolder?: (repositoryId: string) => Promise<void> | void
  onOpenWebsite?: (repository: Repository) => Promise<void> | void
  onOpenReader?: (repository: Repository) => Promise<void> | void
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

export function CatalogPage({ onDownload, onUpdate, onRemove, onAddLocalSource, onAddRemoteSource, onOpenFolder, onOpenWebsite, onOpenReader }: CatalogPageProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [detailsRepositoryId, setDetailsRepositoryId] = useState<string | null>(null)
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => new Set())
  const [nativeSourceMetadata, setNativeSourceMetadata] = useState<Record<string, NativeSourceMetadata>>({})
  const [nativeSourcesHydrated, setNativeSourcesHydrated] = useState(false)
  const [updateState, setUpdateState] = useState<DownloadState>('idle')
  const [updateReviewOpen, setUpdateReviewOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [capabilityFilter, setCapabilityFilter] = useState('All')
  const [installationFilter, setInstallationFilter] = useState('All')
  const [customRepositories, setCustomRepositories] = useState<Repository[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [metadataById, setMetadataById] = useState<Record<string, RepositoryMetadataOverride>>({})
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [sourceName, setSourceName] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [readerError, setReaderError] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [remoteSourceOpen, setRemoteSourceOpen] = useState(false)
  const [remoteSourceUrl, setRemoteSourceUrl] = useState('')
  const [remoteSourceName, setRemoteSourceName] = useState('')
  const [remoteSourceRef, setRemoteSourceRef] = useState('main')
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  function handleFolderSelection(event: ChangeEvent<HTMLInputElement>): void {
    const selected = event.target.files?.[0] as (File & { path?: string }) | undefined
    if (!selected?.path || !onAddLocalSource) return
    setSourcePath(selected.path.replace(/[\\/]([^\\/]+)$/, ''))
    setSourceName(selected.name || 'Local source')
    setAddSourceOpen(true)
  }

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    void invokeCommand<Array<NativeSourceMetadata & { displayName?: string; capability?: string }>>('list_sources')
      .then((sources) => {
        if (active) {
          setInstalledIds(new Set(sources.map(({ id }) => id)))
          setNativeSourceMetadata(Object.fromEntries(sources.map((source) => [source.id, source])))
          setNativeSourcesHydrated(true)
          const builtInIds = new Set(repositories.map(({ id }) => id))
          setCustomRepositories(sources
            .filter(({ id }) => !builtInIds.has(id))
            .map(nativeSourceToRepository))
        }
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    const refreshUpdateAvailability = () => {
      void invokeCommand<UpdateAvailabilityReport[]>('check_due_updates')
        .then((reports) => {
          if (!active) return
          setNativeSourceMetadata((current) => {
            const next = { ...current }
            reports.forEach((report) => {
              next[report.sourceId] = {
                ...(next[report.sourceId] ?? { id: report.sourceId }),
                availability: report.availability,
              }
            })
            return next
          })
        })
        .catch(() => undefined)
    }
    refreshUpdateAvailability()
    const interval = window.setInterval(refreshUpdateAvailability, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!hasNativeBridge()) return
    void invokeCommand<Record<string, unknown>>('get_settings')
      .then((settings) => {
        const organization = settings.catalogOrganization
        if (!organization || typeof organization !== 'object') return
        const value = organization as { pinnedIds?: unknown; hiddenIds?: unknown }
        if (Array.isArray(value.pinnedIds)) setPinnedIds(new Set(value.pinnedIds.filter((id): id is string => typeof id === 'string')))
        if (Array.isArray(value.hiddenIds)) setHiddenIds(new Set(value.hiddenIds.filter((id): id is string => typeof id === 'string')))
      })
      .catch(() => undefined)
    void invokeCommand<Record<string, unknown>>('get_settings')
      .then((settings) => {
        if (settings.catalogMetadata && typeof settings.catalogMetadata === 'object') setMetadataById(settings.catalogMetadata as Record<string, RepositoryMetadataOverride>)
        if (Array.isArray(settings.catalogCategories)) setCustomCategories(settings.catalogCategories.filter((category): category is string => typeof category === 'string'))
      })
      .catch(() => undefined)
  }, [])

  function persistOrganization(nextPinned: Set<string>, nextHidden: Set<string>): void {
    if (!hasNativeBridge()) return
    void invokeCommand('update_settings', { patch: { catalogOrganization: { pinnedIds: [...nextPinned], hiddenIds: [...nextHidden] } } }).catch(() => undefined)
  }

  function persistMetadata(nextMetadata: Record<string, RepositoryMetadataOverride>, nextCategories: string[] = customCategories): void {
    if (!hasNativeBridge()) return
    void invokeCommand('update_settings', { patch: { catalogMetadata: nextMetadata, catalogCategories: nextCategories } }).catch(() => undefined)
  }

  function togglePin(repositoryId: string): void {
    setPinnedIds((current) => {
      const next = new Set(current)
      if (next.has(repositoryId)) next.delete(repositoryId)
      else next.add(repositoryId)
      persistOrganization(next, hiddenIds)
      return next
    })
  }

  function hideRepository(repositoryId: string): void {
    setHiddenIds((current) => {
      const next = new Set(current)
      if (next.has(repositoryId)) next.delete(repositoryId)
      else next.add(repositoryId)
      persistOrganization(pinnedIds, next)
      return next
    })
  }

  const catalogRepositories = useMemo(
    () => [...repositories, ...customRepositories].map((repository) => ({
      ...repository,
      ...applyNativeSourceMetadata(repository, nativeSourceMetadata[repository.id] ?? { id: repository.id }),
      ...(metadataById[repository.id] ?? {}),
      status: resolveCatalogStatus(repository.status, repository.id, installedIds, nativeSourcesHydrated),
    })),
    [customRepositories, installedIds, metadataById, nativeSourceMetadata, nativeSourcesHydrated],
  )

  const visibleRepositories = useMemo(
    () => catalogRepositories.filter((repository) => (
      (showHidden || !hiddenIds.has(repository.id))
      && matchesRepositoryQuery(repository, deferredSearchQuery)
      && (categoryFilter === 'All' || repository.category === categoryFilter)
      && (capabilityFilter === 'All' || repository.capability === capabilityFilter)
      && (installationFilter === 'All'
        || installationFilter === (repository.status === 'Ready' ? 'Installed' : 'Not installed'))
    )).sort((left, right) => Number(pinnedIds.has(right.id)) - Number(pinnedIds.has(left.id))),
    [catalogRepositories, deferredSearchQuery, categoryFilter, capabilityFilter, installationFilter, hiddenIds, showHidden, pinnedIds],
  )
  const categories = useMemo(() => ['All', ...new Set([...catalogRepositories.map(({ category }) => category), ...customCategories])], [catalogRepositories, customCategories])
  const capabilities = useMemo(() => ['All', ...new Set(catalogRepositories.map(({ capability }) => capability))], [catalogRepositories])
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

  async function openReader(repository: Repository): Promise<void> {
    if (!onOpenReader) return

    setReaderError(null)
    try {
      await onOpenReader(repository)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      setReaderError(`The reader could not be opened for ${repository.name}: ${detail}`)
    }
  }

  async function updateSelectedRepositories(): Promise<void> {
    const installedSelection = catalogRepositories
      .filter(({ id, status }) => selectedIds.includes(id) && status === 'Ready')
      .map(({ id }) => id)
    await updateRepositories(installedSelection)
  }

  function hideSelectedRepositories(): void {
    setHiddenIds((current) => {
      const next = new Set(current)
      selectedIds.forEach((id) => next.add(id))
      persistOrganization(pinnedIds, next)
      return next
    })
    setSelectedIds([])
    setSelectionAnchorId(null)
  }

  async function removeSelectedRepositories(): Promise<void> {
    const selected = [...selectedIds]
    await Promise.all(selected.map((repositoryId) => removeRepository(repositoryId)))
    setSelectedIds([])
    setSelectionAnchorId(null)
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

  async function addRemoteSource(): Promise<void> {
    const displayName = remoteSourceName.trim()
    const source = remoteSourceUrl.trim()
    const selectedRef = remoteSourceRef.trim()
    const validSource = /^https:\/\//i.test(source) || /^ssh:\/\//i.test(source) || /^git@[^:]+:.+/.test(source)
    if (!displayName || !validSource || !selectedRef || !onAddRemoteSource) {
      setSourceError('Enter a name, an HTTPS or SSH Git URL, and a branch or tag.')
      return
    }
    setSourceError(null)
    try {
      const id = `custom-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const repository = await onAddRemoteSource({ id, displayName, source, selectedRef })
      setCustomRepositories((current) => [...current.filter(({ id: currentId }) => currentId !== repository.id), repository])
      setInstalledIds((current) => new Set([...current, repository.id]))
      setRemoteSourceOpen(false)
      setRemoteSourceName('')
      setRemoteSourceUrl('')
      setRemoteSourceRef('main')
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'The repository could not be added.')
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
  const visibleGroups = technologyGroups
    .map((group) => ({ group, repositories: getGroupRepositories(group, visibleRepositories) }))
    .filter(({ repositories: groupRepositories }) => groupRepositories.length > 1)

  return (
    <div id="catalog" className={`space-y-9 ${dropActive ? 'rounded-2xl ring-2 ring-x-mint-strong ring-offset-4' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDropActive(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDropActive(false) }} onDrop={(event) => { event.preventDefault(); setDropActive(false); const droppedFile = event.dataTransfer.files[0] as (File & { path?: string }) | undefined; if (droppedFile?.path && onAddLocalSource) { setSourcePath(droppedFile.path); setSourceName(droppedFile.name || 'Local source'); setAddSourceOpen(true) } }}>
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
          {selectedIds.length > 0 && <>
            {onUpdate && <button type="button" onClick={() => void updateSelectedRepositories()} disabled={updateState === 'loading'} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">Update selected ({selectedIds.length})</button>}
            <button type="button" onClick={hideSelectedRepositories} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">Hide selected ({selectedIds.length})</button>
            {onRemove && <button type="button" onClick={() => void removeSelectedRepositories()} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold text-x-coral hover:bg-x-coral/10">Remove selected ({selectedIds.length})</button>}
          </>}
          {onAddLocalSource && <><button type="button" onClick={() => setAddSourceOpen(true)} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">Add local source</button><label className="cursor-pointer rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">Choose folder<input aria-label="Choose local folder" type="file" {...({ webkitdirectory: 'true', directory: 'true' } as InputHTMLAttributes<HTMLInputElement>)} onChange={handleFolderSelection} className="sr-only" /></label></>}
          {onAddRemoteSource && <button type="button" onClick={() => setRemoteSourceOpen(true)} className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper">Add Git repository</button>}
          {installedIds.size > 0 && onUpdate && (
            <button
              type="button"
              onClick={() => setUpdateReviewOpen(true)}
              disabled={updateState === 'loading'}
              aria-busy={updateState === 'loading'}
              className="rounded-xl border border-x-line bg-x-panel px-4 py-3 text-sm font-semibold hover:bg-x-paper"
            >
              <RefreshCw aria-hidden="true" className="mr-2 inline" size={16} />
              {updateState === 'loading' ? 'Updating all…' : updateState === 'success' ? 'All sources updated' : updateState === 'error' ? 'Update failed — retry' : 'Update all'}
            </button>
          )}
          <div className="relative">
            <button type="button" aria-label="Filter repositories" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className="grid size-11 place-items-center rounded-xl border border-x-line bg-x-panel text-x-muted hover:bg-x-paper">
              <SlidersHorizontal aria-hidden="true" size={17} />
            </button>
            {filtersOpen && (
              <div className="absolute right-0 top-14 z-20 w-64 space-y-3 rounded-xl border border-x-line bg-x-panel p-4 shadow-xl">
                <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />Show hidden sources</label>
                <label className="block text-xs font-semibold">Category<select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="block text-xs font-semibold">Capability<select aria-label="Filter by capability" value={capabilityFilter} onChange={(event) => setCapabilityFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm">{capabilities.map((capability) => <option key={capability}>{capability}</option>)}</select></label>
                <label className="block text-xs font-semibold">Installation<select aria-label="Filter by installation" value={installationFilter} onChange={(event) => setInstallationFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-x-line bg-x-paper px-2 py-2 text-sm"><option>All</option><option>Installed</option><option>Not installed</option></select></label>
              </div>
            )}
          </div>
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

      {readerError && (
        <p role="alert" className="rounded-xl border border-x-coral/40 bg-x-coral/10 p-4 text-sm text-x-danger">
          {readerError}
        </p>
      )}

      {visibleRepositories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-x-line bg-x-panel p-10 text-center text-sm text-x-muted">
          No repositories match “{searchQuery}”.
        </p>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map(({ group, repositories: groupRepositories }) => (
            <TechnologyGroupCard
              key={group.id}
              group={group}
              repositories={groupRepositories}
              onDownload={() => void startDownload(groupRepositories.filter(({ capability }) => capability !== 'Website only').map(({ id }) => id))}
              onUpdate={onUpdate ? () => void updateRepositories(groupRepositories.filter(({ status }) => status === 'Ready').map(({ id }) => id)) : () => undefined}
            />
          ))}
          <VirtualizedGrid
            items={visibleRepositories}
            renderItem={(repository, index) => (
              <RepositoryCard
                key={repository.id}
                repo={repository}
                featured={index === 0 && deferredSearchQuery === ''}
                selected={selectedRepositoryIds.has(repository.id)}
                onSelect={(shiftKey) => handleSelect(repository.id, shiftKey)}
                onOpen={() => setDetailsRepositoryId(repository.id)}
                onRead={onOpenReader ? () => void openReader(repository) : undefined}
                onDownload={() => void startDownload([repository.id])}
                onUpdate={onUpdate ? () => void updateRepositories([repository.id]) : undefined}
                onRemove={onRemove ? () => void removeRepository(repository.id) : undefined}
                onOpenFolder={onOpenFolder ? () => void onOpenFolder(repository.id) : undefined}
                onOpenWebsite={onOpenWebsite ? (source) => void onOpenWebsite(source) : undefined}
                pinned={pinnedIds.has(repository.id)}
                onTogglePin={() => togglePin(repository.id)}
                onHide={() => hideRepository(repository.id)}
                hidden={hiddenIds.has(repository.id)}
              />
            )}
          />
        </div>
      )}
      {detailsRepository && <SourceDetails repository={detailsRepository} categories={categories} onClose={() => setDetailsRepositoryId(null)} onSaveMetadata={(metadata) => { const next = { ...metadataById, [detailsRepository.id]: metadata }; setMetadataById(next); const nextCategories = metadata.category && !categories.includes(metadata.category) ? [...customCategories, metadata.category] : customCategories; setCustomCategories(nextCategories); persistMetadata(next, nextCategories) }} onResetMetadata={() => { const next = { ...metadataById }; delete next[detailsRepository.id]; setMetadataById(next); persistMetadata(next) }} />}
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
      {remoteSourceOpen && onAddRemoteSource && <div className="fixed inset-0 z-30 grid place-items-center bg-x-ink/30 p-5" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="add-remote-title" className="w-full max-w-lg rounded-2xl border border-x-line bg-x-panel p-6 shadow-2xl"><h2 id="add-remote-title" className="font-display text-2xl tracking-tight">Add Git repository</h2><p className="mt-2 text-sm text-x-muted">Unsupported repositories remain manageable and open in the system explorer. HTTPS and SSH sources use your existing Git credentials.</p><div className="mt-5 space-y-4"><label className="block space-y-2 text-sm"><span className="font-semibold">Name</span><input aria-label="Git repository name" value={remoteSourceName} onChange={(event) => setRemoteSourceName(event.target.value)} className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2" /></label><label className="block space-y-2 text-sm"><span className="font-semibold">Git URL</span><input aria-label="Git repository URL" value={remoteSourceUrl} onChange={(event) => setRemoteSourceUrl(event.target.value)} placeholder="https://github.com/org/repo.git or git@github.com:org/repo.git" className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2" /></label><label className="block space-y-2 text-sm"><span className="font-semibold">Branch or tag</span><input aria-label="Git branch or tag" value={remoteSourceRef} onChange={(event) => setRemoteSourceRef(event.target.value)} className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2" /></label>{sourceError && <p role="alert" className="text-sm text-x-coral">{sourceError}</p>}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRemoteSourceOpen(false)} className="rounded-lg border border-x-line px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => void addRemoteSource()} className="rounded-lg bg-x-ink px-4 py-2 text-sm font-semibold text-x-paper">Download repository</button></div></section></div>}
      {updateReviewOpen && onUpdate && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-x-ink/30 p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="update-review-title" className="w-full max-w-lg rounded-2xl border border-x-line bg-x-panel p-6 shadow-2xl">
            <h2 id="update-review-title" className="font-display text-2xl tracking-tight">Review update all</h2>
            <p className="mt-2 text-sm text-x-muted">Xenics will check each installed source. Files-only and explicitly referenced local folders are included only when their update policy allows it; website-only sources are skipped.</p>
            <div className="mt-5 max-h-48 space-y-2 overflow-auto">
              {[...installedIds].map((id) => {
                const repository = catalogRepositories.find(({ id: repositoryId }) => repositoryId === id)
                const skipped = repository?.capability === 'Website only'
                return <div key={id} className="flex items-center justify-between rounded-lg bg-x-paper px-3 py-2 text-sm"><span>{repository?.name ?? id}</span><span className="text-xs text-x-muted">{skipped ? 'Skipped' : 'Included'}</span></div>
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setUpdateReviewOpen(false)} className="rounded-lg border border-x-line px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => { setUpdateReviewOpen(false); void updateRepositories([...installedIds]) }} className="rounded-lg bg-x-ink px-4 py-2 text-sm font-semibold text-x-paper">Start updates</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
