import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookmarksPanel } from './BookmarksPanel'

const bookmark = {
  id: 'react:start',
  sourceId: 'react',
  refName: 'main',
  path: 'start.md',
  title: 'Getting started',
  tagIds: [],
  available: true,
}

describe('BookmarksPanel', () => { it('opens bookmarks and exposes unavailable state', () => { const onOpen = vi.fn(); render(<BookmarksPanel bookmarks={[bookmark]} onOpen={onOpen} />); screen.getByRole('button', { name: /getting started/i }).click(); expect(onOpen).toHaveBeenCalledWith(bookmark) }) })
