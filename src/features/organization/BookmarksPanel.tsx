import { Bookmark as BookmarkIcon, FolderPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Bookmark } from './organization-model'

type BookmarksPanelProps = {
  bookmarks: Bookmark[]
  onOpen: (bookmark: Bookmark) => void
  onCreateCollection?: () => void
}

export function BookmarksPanel({ bookmarks, onOpen, onCreateCollection }: BookmarksPanelProps): ReactNode {
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
            <button
              key={bookmark.id}
              type="button"
              onClick={() => onOpen(bookmark)}
              className="block w-full rounded-xl px-3 py-3 text-left hover:bg-x-paper"
            >
              <p className="font-semibold">{bookmark.title}</p>
              <p className="mt-1 text-xs text-x-muted">
                {bookmark.sourceId} · {bookmark.refName} · {bookmark.path}
                {!bookmark.available && ' · Unavailable'}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
