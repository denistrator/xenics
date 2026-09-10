import { Bookmark as BookmarkIcon, FolderPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Bookmark } from './organization-model'
import type { Collection } from './organization-model'

type BookmarksPanelProps = {
  bookmarks: Bookmark[]
  onOpen: (bookmark: Bookmark) => void
  onCreateCollection?: () => void
  collections?: Collection[]
  onCollectionChange?: (bookmark: Bookmark, collectionId: string | undefined) => void
}

export function BookmarksPanel({ bookmarks, onOpen, onCreateCollection, collections = [], onCollectionChange }: BookmarksPanelProps): ReactNode {
  return (
    <section aria-labelledby="bookmarks-title" className="rounded-2xl border border-x-line bg-x-panel p-5">
      <div className="flex items-center justify-between">
        <h2 id="bookmarks-title" className="flex items-center gap-2 text-lg font-semibold">
          <BookmarkIcon aria-hidden="true" size={18} />
          Bookmarks
        </h2>
        <button
          type="button"
          aria-label="Create collection"
          onClick={onCreateCollection}
          className="rounded-lg p-2 text-x-muted hover:bg-x-paper"
        >
          <FolderPlus aria-hidden="true" size={17} />
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <p className="mt-4 text-sm text-x-muted">Saved documents will appear here.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="rounded-xl px-3 py-3 hover:bg-x-paper">
              <button type="button" onClick={() => onOpen(bookmark)} className="block w-full text-left">
                <p className="font-semibold">{bookmark.title}</p>
              </button>
              <p className="mt-1 text-xs text-x-muted">
                {bookmark.sourceId} · {bookmark.refName} · {bookmark.path}
                {!bookmark.available && ' · Unavailable'}
              </p>
              {collections.length > 0 && onCollectionChange && (
                <select
                  aria-label={`Collection for ${bookmark.title}`}
                  value={bookmark.collectionId ?? ''}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onCollectionChange(bookmark, event.target.value || undefined)}
                  className="mt-2 rounded-md border border-x-line bg-x-panel px-2 py-1 text-xs"
                >
                  <option value="">No collection</option>
                  {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
