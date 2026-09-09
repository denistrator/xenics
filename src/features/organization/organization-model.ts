export type ReaderTarget = { sourceId: string; refName: string; path: string; title: string; anchor?: string }
export type Bookmark = ReaderTarget & { id: string; collectionId?: string; tagIds: string[]; available: boolean }
export type Collection = { id: string; name: string }
export type Tag = { id: string; name: string }
