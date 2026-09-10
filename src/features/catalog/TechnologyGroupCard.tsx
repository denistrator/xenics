import { Download, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Repository } from './catalog-model'
import type { TechnologyGroup } from './catalog-groups'

type TechnologyGroupCardProps = {
  group: TechnologyGroup
  repositories: Repository[]
  onDownload: () => void
  onUpdate: () => void
}

export function TechnologyGroupCard({ group, repositories, onDownload, onUpdate }: TechnologyGroupCardProps): ReactNode {
  const installedCount = repositories.filter(({ status }) => status === 'Ready').length
  const downloadableCount = repositories.filter(({ capability }) => capability !== 'Website only').length
  const groupStatus = installedCount === repositories.length ? 'Installed' : installedCount > 0 ? 'Partially installed' : 'Not installed'

  return (
    <section className="rounded-2xl border border-x-line bg-x-paper/70 p-5" aria-labelledby={`group-${group.id}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-x-mint-strong">Technology group</p>
          <h2 id={`group-${group.id}`} className="mt-1 text-xl font-semibold tracking-tight">{group.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-x-muted">{group.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onDownload} disabled={downloadableCount === 0} className="rounded-lg bg-x-ink px-3 py-2 text-sm font-semibold text-x-paper disabled:opacity-40">
            <Download aria-hidden="true" className="mr-2 inline" size={15} />Download {group.name}
          </button>
          <button type="button" onClick={onUpdate} disabled={installedCount === 0} className="rounded-lg border border-x-line px-3 py-2 text-sm font-semibold disabled:opacity-40">
            <RefreshCw aria-hidden="true" className="mr-2 inline" size={15} />Update {group.name}
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-x-muted">
        <span className="rounded-full bg-x-mint px-3 py-1 text-x-ink">{groupStatus}</span>
        <span>{installedCount}/{repositories.length} installed</span>
        <span>{repositories.map(({ name, capability }) => `${name} · ${capability}`).join('  •  ')}</span>
      </div>
    </section>
  )
}
