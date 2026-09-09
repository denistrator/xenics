import type { ReactNode } from 'react'
import { BookmarksPanel } from './BookmarksPanel'
import { CollectionsPanel } from './CollectionsPanel'
import { TagPicker } from './TagPicker'
import type { Collection, Tag } from './organization-model'
import { useBookmarks, useNamedOrganizationRecords } from './organization-hooks'

export function OrganizationPage(): ReactNode {
  const { bookmarks } = useBookmarks()
  const collections = useNamedOrganizationRecords<Collection>('list_collections')
  const tags = useNamedOrganizationRecords<Tag>('list_tags')
  const selectedTags = bookmarks.flatMap(({ tagIds }) => tagIds)

  return (
    <section aria-labelledby="organization-title" className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Your organization</p>
        <h1 id="organization-title" className="mt-2 font-display text-4xl tracking-tight">Bookmarks and collections</h1>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <BookmarksPanel bookmarks={bookmarks} onOpen={() => undefined} />
        <CollectionsPanel collections={collections} />
      </div>
      <section className="rounded-2xl border border-x-line bg-x-panel p-5">
        <TagPicker tags={tags} selected={selectedTags} onToggle={() => undefined} />
      </section>
    </section>
  )
}
