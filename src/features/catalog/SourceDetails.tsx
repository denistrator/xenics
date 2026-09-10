import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Repository } from './catalog-model'

type SourceDetailsProps = {
  repository: Repository
  onClose: () => void
  categories: string[]
  onSaveMetadata: (metadata: { name: string; icon: string; description: string; category: string; tags: string[] }) => void
  onResetMetadata: () => void
}

export function SourceDetails({ repository, onClose, categories, onSaveMetadata, onResetMetadata }: SourceDetailsProps): ReactNode {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(repository.name)
  const [icon, setIcon] = useState(repository.icon ?? repository.name.slice(0, 1))
  const [description, setDescription] = useState(repository.description)
  const [category, setCategory] = useState(repository.category)
  const [tags, setTags] = useState((repository.tags ?? []).join(', '))

  function save(): void {
    onSaveMetadata({ name: name.trim(), icon: icon.trim() || repository.name.slice(0, 1), description: description.trim(), category, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-x-ink/30 p-4 backdrop-blur-sm" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label={`${repository.name} details`} className="w-full max-w-lg rounded-2xl border border-x-line bg-x-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-x-mint text-lg font-bold text-x-ink">{repository.icon ?? repository.name.slice(0, 1)}</span>
            <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-x-mint-strong">Source details</p>
            <h2 id="source-details-title" className="mt-2 text-2xl font-semibold">{repository.name}</h2>
          </div>
          </div>
          <button type="button" aria-label="Close source details" onClick={onClose} className="rounded-lg p-2 text-x-muted hover:bg-x-paper">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {editing ? <div className="mt-4 space-y-3"><label className="block text-sm font-semibold">Display name<input aria-label="Edit display name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold">Icon<input aria-label="Edit icon" value={icon} maxLength={4} onChange={(event) => setIcon(event.target.value)} className="mt-1 block w-20 rounded-lg border border-x-line bg-x-paper px-3 py-2 text-center text-xl font-normal" /></label><label className="block text-sm font-semibold">Description<textarea aria-label="Edit description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold">Category<input aria-label="Edit category" list="repository-categories" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 font-normal" /><datalist id="repository-categories">{categories.filter((value) => value !== 'All').map((value) => <option key={value} value={value} />)}</datalist></label><label className="block text-sm font-semibold">Tags<input aria-label="Edit tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="state, hooks" className="mt-1 block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 font-normal" /></label></div> : <p className="mt-4 leading-7 text-x-muted">{repository.description}</p>}
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Vendor</dt><dd className="mt-1">{repository.vendor}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Category</dt><dd className="mt-1">{repository.category}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Capability</dt><dd className="mt-1">{repository.capability}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Selected ref</dt><dd className="mt-1">{repository.selectedRef}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-x-muted">Tags</dt><dd className="mt-1">{repository.tags?.join(', ') || 'None'}</dd></div>
        </dl>
        <a href={repository.sourceUrl} target="_blank" rel="noreferrer" className="mt-6 block break-all rounded-xl bg-x-paper p-3 text-sm text-x-mint-strong underline underline-offset-4">
          {repository.sourceUrl}
        </a>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing((open) => !open)} className="rounded-lg border border-x-line px-3 py-2 text-sm font-semibold">{editing ? 'Cancel edit' : 'Edit metadata'}</button>{editing ? <button type="button" onClick={save} disabled={!name.trim() || !description.trim()} className="rounded-lg bg-x-ink px-3 py-2 text-sm font-semibold text-x-paper disabled:opacity-40">Save</button> : <button type="button" onClick={onResetMetadata} className="rounded-lg border border-x-line px-3 py-2 text-sm font-semibold">Reset to default</button>}</div>
      </section>
    </div>
  )
}
