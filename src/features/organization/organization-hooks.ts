import { useState } from 'react'
import type { Bookmark, ReaderTarget } from './organization-model'

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  function saveBookmark(target: ReaderTarget) {
    const bookmark: Bookmark = { ...target, id: `${target.sourceId}:${target.path}`, tagIds: [], available: true }
    setBookmarks((current) => [...current, bookmark])
    return bookmark
  }
  return { bookmarks, saveBookmark }
}

export function parseXenicsUrl(url: string): Omit<ReaderTarget, 'title'> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'xenics:' || parsed.hostname !== 'docs') throw new Error('Invalid Xenics deep link')
  const sourceId = parsed.pathname.replace(/^\//, '')
  const refName = parsed.searchParams.get('ref')
  const path = parsed.searchParams.get('path')
  if (!sourceId || !refName || !path || path.split('/').includes('..')) throw new Error('Invalid Xenics deep link target')
  const anchor = parsed.searchParams.get('anchor') ?? undefined
  return anchor ? { sourceId, refName, path, anchor } : { sourceId, refName, path }
}
