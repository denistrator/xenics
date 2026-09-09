import { Folder } from 'lucide-react'
import type { Collection } from './organization-model'

type CollectionsPanelProps = {
  collections: Collection[]
  counts?: Record<string, number>
}

export function CollectionsPanel({
  collections,
  counts,
}: CollectionsPanelProps) {
  return (
    <section
      aria-labelledby="collections-title"
      className="rounded-2xl border border-x-line bg-x-panel p-5"
    >
      <h2 id="collections-title" className="flex items-center gap-2 text-lg font-semibold">
        <Folder size={18} />
        Collections
      </h2>
      <div className="mt-4 space-y-1">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="flex items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-x-paper"
          >
            <span>{collection.name}</span>
            <span className="text-xs text-x-muted">
              {counts?.[collection.id] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
