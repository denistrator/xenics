import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Repository } from './catalog-model'

type SourceDetailsProps = {
  repository: Repository
  onClose: () => void
}

export function SourceDetails({ repository, onClose }: SourceDetailsProps): ReactNode {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-x-ink/30 p-4 backdrop-blur-sm" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label={`${repository.name} details`} className="w-full max-w-lg rounded-2xl border border-x-line bg-x-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">Source details</p>
            <h2 id="source-details-title" className="mt-2 text-2xl font-semibold">{repository.name}</h2>
          </div>
          <button type="button" aria-label="Close source details" onClick={onClose} className="rounded-lg p-2 text-x-muted hover:bg-x-paper">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p className="mt-4 leading-7 text-x-muted">{repository.description}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Vendor</dt><dd className="mt-1">{repository.vendor}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Category</dt><dd className="mt-1">{repository.category}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Capability</dt><dd className="mt-1">{repository.capability}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Selected ref</dt><dd className="mt-1">{repository.selectedRef}</dd></div>
        </dl>
        <a href={repository.sourceUrl} target="_blank" rel="noreferrer" className="mt-6 block break-all rounded-xl bg-x-paper p-3 text-sm text-x-mint-strong underline underline-offset-4">
          {repository.sourceUrl}
        </a>
      </section>
    </div>
  )
}
