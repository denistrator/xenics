import { useCallback, useState } from 'react'
import type { Bookmark, ReaderTarget } from './organization-model'

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/

function isSafeLinkValue(value: string | null): value is string {
  return value !== null && value.trim().length > 0 && !CONTROL_CHARACTER_PATTERN.test(value)
}

function isSafeRelativePath(value: string): boolean {
  const normalizedPath = value.replace(/\\/g, '/')
  if (normalizedPath.startsWith('/') || /^[a-zA-Z]:\//.test(normalizedPath)) return false

  return normalizedPath.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  const saveBookmark = useCallback((target: ReaderTarget): Bookmark => {
    const bookmark: Bookmark = {
      ...target,
      id: `${target.sourceId}:${target.refName}:${target.path}`,
      tagIds: [],
      available: true,
    }

    setBookmarks((current) => {
      const existingIndex = current.findIndex((value) => value.id === bookmark.id)
      if (existingIndex < 0) return [...current, bookmark]

      return current.map((value, index) => index === existingIndex
        ? { ...value, ...bookmark, tagIds: value.tagIds }
        : value)
    })
    return bookmark
  }, [])

  return { bookmarks, saveBookmark }
}

export function parseXenicsUrl(url: string): Omit<ReaderTarget, 'title'> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid Xenics deep link')
  }

  if (parsed.protocol !== 'xenics:' || parsed.hostname !== 'docs' || parsed.username || parsed.password || parsed.port) {
    throw new Error('Invalid Xenics deep link')
  }

  let sourceId: string
  try {
    sourceId = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  } catch {
    throw new Error('Invalid Xenics deep link target')
  }
  const refName = parsed.searchParams.get('ref')
  const path = parsed.searchParams.get('path')
  if (!isSafeLinkValue(sourceId) || sourceId.includes('/') || !isSafeLinkValue(refName) || !isSafeLinkValue(path) || !isSafeRelativePath(path)) {
    throw new Error('Invalid Xenics deep link target')
  }

  const anchor = parsed.searchParams.get('anchor') ?? undefined
  if (anchor !== undefined && !isSafeLinkValue(anchor)) throw new Error('Invalid Xenics deep link anchor')

  return anchor ? { sourceId, refName, path, anchor } : { sourceId, refName, path }
}
