import { ArrowUpRight, Check, Download, EyeOff, FolderOpen, Pin, RefreshCw, Trash2 } from 'lucide-react'
import type { ChangeEvent, ReactNode } from 'react'
import type { Repository, RepositoryAccent } from './catalog-model'

type RepositoryCardProps = {
  repo: Repository
  selected: boolean
  onSelect: (shiftKey: boolean) => void
  onOpen: () => void
  onDownload?: () => void
  onUpdate?: () => void
  onRemove?: () => void
  onOpenFolder?: () => void
  onOpenWebsite?: () => void
  pinned?: boolean
  onTogglePin?: () => void
  onHide?: () => void
  hidden?: boolean
  featured?: boolean
}

const accentClasses: Record<RepositoryAccent, string> = {
  mint: 'bg-x-mint',
  sky: 'bg-x-sky',
  coral: 'bg-x-coral',
  amber: 'bg-x-amber',
  teal: 'bg-x-teal',
  violet: 'bg-x-violet',
}

function isShiftPressed(event: ChangeEvent<HTMLInputElement>): boolean {
  return 'shiftKey' in event.nativeEvent && event.nativeEvent.shiftKey === true
}

export function RepositoryCard({
  repo,
  selected,
  onSelect,
  onOpen,
  onDownload,
  onUpdate,
  onRemove,
  onOpenFolder,
  onOpenWebsite,
  pinned = false,
  onTogglePin,
  onHide,
  hidden = false,
  featured = false,
}: RepositoryCardProps): ReactNode {
  const isInstalled = repo.status === 'Ready'
  const isFilesOnly = repo.capability === 'Files only'
  const isWebsiteOnly = repo.capability === 'Website only'
  const isDownloadable = !isWebsiteOnly
  const primaryActionLabel = isWebsiteOnly
    ? 'Open website'
    : isInstalled
      ? isFilesOnly ? 'Open folder' : 'Read documentation'
      : isFilesOnly ? 'Download repository' : 'Download docs'

  function handleSelectionChange(event: ChangeEvent<HTMLInputElement>): void {
    onSelect(isShiftPressed(event))
  }

  return (
    <article
      aria-labelledby={`repository-${repo.id}`}
      className={`group relative overflow-hidden rounded-2xl border border-x-line bg-x-panel p-5 shadow-[var(--x-shadow)] transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl ${featured ? 'sm:col-span-2 xl:col-span-2' : ''}`}
    >
      <div className="mb-7 flex items-start justify-between">
        <span
          aria-hidden="true"
          className={`grid size-12 place-items-center rounded-2xl text-lg font-bold text-x-ink ${accentClasses[repo.accent]}`}
        >
          {repo.name.slice(0, 1)}
        </span>
        {isDownloadable && (
          <label className="grid size-11 place-items-center rounded-xl hover:bg-x-paper">
            <span className="sr-only">Select {repo.name}</span>
            <input
              type="checkbox"
              checked={selected}
              onChange={handleSelectionChange}
            />
          </label>
        )}
        <div className="absolute right-3 top-3 flex gap-1">
          {onTogglePin && <button type="button" aria-label={`${pinned ? 'Unpin' : 'Pin'} ${repo.name}`} onClick={onTogglePin} className="rounded-lg p-2 text-x-muted hover:bg-x-paper"><Pin aria-hidden="true" size={15} fill={pinned ? 'currentColor' : 'none'} /></button>}
          {onHide && <button type="button" aria-label={`${hidden ? 'Show' : 'Hide'} ${repo.name}`} onClick={onHide} className="rounded-lg p-2 text-x-muted hover:bg-x-paper"><EyeOff aria-hidden="true" size={15} /></button>}
        </div>
      </div>

      <button
        type="button"
        aria-label={`${repo.name} details`}
        onClick={onOpen}
        className="block w-full text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-x-muted">
          {repo.vendor}
        </p>
        <h2 id={`repository-${repo.id}`} className="mt-1 text-xl font-semibold tracking-tight">
          {repo.name}
        </h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-x-muted">{repo.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-x-muted">
          <span className="rounded-full bg-x-paper px-2.5 py-1">{repo.category}</span>
          <span className="rounded-full bg-x-paper px-2.5 py-1">{repo.capability}</span>
        </div>
      </button>

      <div className="mt-6 flex items-center justify-between border-t border-x-line pt-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-x-muted">
          {isInstalled ? (
            <>
              <Check aria-hidden="true" className="text-x-mint-strong" size={15} />
              Installed
            </>
          ) : (
            'Not installed'
          )}
        </span>
        <div className="flex items-center gap-1">
          {isInstalled && onUpdate && !isFilesOnly && (
            <button type="button" onClick={onUpdate} className="rounded-lg p-2 text-x-muted hover:bg-x-mint hover:text-x-ink" aria-label={`Update ${repo.name}`}>
              <RefreshCw aria-hidden="true" size={16} />
            </button>
          )}
          {isInstalled && onRemove && (
            <button type="button" onClick={onRemove} className="rounded-lg p-2 text-x-muted hover:bg-x-coral hover:text-x-ink" aria-label={`Remove ${repo.name}`}>
              <Trash2 aria-hidden="true" size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={isWebsiteOnly ? onOpenWebsite : isFilesOnly && isInstalled ? onOpenFolder : isInstalled ? onOpen : onDownload}
            disabled={!isInstalled && !isWebsiteOnly && !onDownload}
            className="rounded-lg p-2 text-x-muted hover:bg-x-mint hover:text-x-ink"
            aria-label={`${primaryActionLabel}: ${repo.name}`}
            title={primaryActionLabel}
          >
            {isFilesOnly ? <FolderOpen aria-hidden="true" size={17} /> : <ArrowUpRight aria-hidden="true" size={17} />}
          </button>
        </div>
      </div>

      {!isInstalled && isDownloadable && onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-x-ink py-3 text-sm font-semibold text-x-paper"
        >
          <Download aria-hidden="true" size={16} />
          {primaryActionLabel}
        </button>
      )}
    </article>
  )
}
