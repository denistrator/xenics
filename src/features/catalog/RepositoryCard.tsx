import { ArrowUpRight, Check, Download, FolderOpen } from 'lucide-react'
import type { Repository } from './catalog-model'

type RepositoryCardProps = {
  repo: Repository
  selected: boolean
  onSelect: (shiftKey: boolean) => void
  onOpen: () => void
}

export function RepositoryCard({ repo, selected, onSelect, onOpen }: RepositoryCardProps) {
  const filesOnly = repo.capability === 'Files only'

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-x-line bg-x-panel p-5 shadow-[var(--x-shadow)] transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-7 flex items-start justify-between">
        <span style={{ backgroundColor: repo.accent }} className="grid size-12 place-items-center rounded-2xl text-lg font-bold text-x-ink">
          {repo.name.slice(0, 1)}
        </span>
        <label className="grid size-11 place-items-center rounded-xl hover:bg-x-paper">
          <span className="sr-only">Select {repo.name}</span>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)}
          />
        </label>
      </div>

      <button aria-label={`${repo.name} details`} onClick={onOpen} className="block w-full text-left">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-x-muted">{repo.vendor}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{repo.name}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-x-muted">{repo.description}</p>
      </button>

      <div className="mt-6 flex items-center justify-between border-t border-x-line pt-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-x-muted">
          {repo.status === 'Ready' ? <><Check size={15} className="text-x-mint-strong" /> Installed</> : 'Not installed'}
        </span>
        <button onClick={onOpen} className="rounded-lg p-2 text-x-muted hover:bg-x-mint hover:text-x-ink" aria-label={`Open ${repo.name}`} title={filesOnly ? 'Open folder' : 'Read documentation'}>
          {filesOnly ? <FolderOpen size={17} /> : <ArrowUpRight size={17} />}
        </button>
      </div>

      {repo.status === 'Not installed' && (
        <button onClick={onOpen} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-x-ink py-3 text-sm font-semibold text-x-paper">
          <Download size={16} />
          {filesOnly ? 'Download repository' : 'Download docs'}
        </button>
      )}
    </article>
  )
}
