import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchResult } from './SearchResult'

const result = {
  id: 'use-state',
  title: 'useState',
  source: 'react',
  path: 'reference.md',
  excerpt: 'The useState hook stores state.',
  matchCount: 2,
  location: { line: 4, column: 1 },
  matchIndex: 0,
}

describe('SearchResult', () => {
  it('opens at the exact match location', () => {
    const onOpen = vi.fn()
    render(<SearchResult result={result} onOpen={onOpen} />)

    screen.getByRole('link', { name: 'useState' }).click()

    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ matchIndex: 0, path: 'reference.md' }),
    )
  })
})
