import type { ReactNode } from 'react'
import { BookmarksPanel } from './BookmarksPanel'
import { CollectionsPanel } from './CollectionsPanel'
import { TagPicker } from './TagPicker'
import type { Collection, Tag } from './organization-model'
import { useBookmarks, useNamedOrganizationRecords } from './organization-hooks'
import type { Bookmark } from './organization-model'
import { useState } from 'react'

export function OrganizationPage({ onOpenBookmark }: { onOpenBookmark?: (bookmark: Bookmark) => void }): ReactNode {
  const { bookmarks, assignCollection, toggleTag } = useBookmarks()
  const { records: collections, createRecord: createCollection } = useNamedOrganizationRecords<Collection>('list_collections', 'create_collection')
  const { records: tags, createRecord: createTag } = useNamedOrganizationRecords<Tag>('list_tags', 'create_tag')
  const selectedTags = [...new Set(bookmarks.flatMap(({ tagIds }) => tagIds))]
  const [lastUsedCollectionId, setLastUsedCollectionId] = useState<string | undefined>()

  function openBookmark(bookmark: typeof bookmarks[number]): void {
    if (!bookmark.available) return
    onOpenBookmark?.(bookmark)
  }

  function askForName(label: string, create: (name: string) => void): void {
    const name = window.prompt(`Name for the new ${label}`)
    if (name !== null) create(name)
  }

  function changeBookmarkCollection(bookmark: Bookmark, collectionId: string | undefined): void {
    setLastUsedCollectionId(collectionId)
    assignCollection(bookmark, collectionId)
  }

  return (
    <section aria-labelledby="organization-title" className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Your organization</p>
        <h1 id="organization-title" className="mt-2 font-display text-4xl tracking-tight">Bookmarks and collections</h1>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <BookmarksPanel
          bookmarks={bookmarks}
          onOpen={openBookmark}
          onCreateCollection={() => askForName('collection', createCollection)}
          collections={collections}
          onCollectionChange={changeBookmarkCollection}
          lastUsedCollectionId={lastUsedCollectionId}
        />
        <CollectionsPanel collections={collections} />
      </div>
      <section className="rounded-2xl border border-x-line bg-x-panel p-5">
        <TagPicker
          tags={tags}
          selected={selectedTags}
          onToggle={(tagId) => bookmarks.forEach((bookmark) => toggleTag(bookmark, tagId))}
          onCreateTag={() => askForName('tag', createTag)}
        />
      </section>
    </section>
  )
}
