import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invokeCommand: vi.fn(),
}))

vi.mock('../lib/tauri', () => ({
  hasNativeBridge: () => false,
  invokeCommand: mocks.invokeCommand,
}))

vi.mock('../features/tasks/use-task-feed', () => ({
  useTaskFeed: () => ({ tasks: [], cancelTask: vi.fn(), retryTask: vi.fn() }),
}))

vi.mock('../features/catalog/CatalogPage', () => ({
  CatalogPage: ({ onOpenReader }: { onOpenReader?: (repository: { id: string; name: string; selectedRef: string }) => void }) => (
    <button
      type="button"
      onClick={() => onOpenReader?.({ id: 'react', name: 'React', selectedRef: 'main' })}
    >
      Open React reader
    </button>
  ),
}))

vi.mock('../features/reader/ReaderWorkspace', () => ({
  ReaderWorkspace: ({ initialTabs }: { initialTabs: Array<{ path: string; title: string }> }) => (
    <p>{`${initialTabs[0]?.title}: ${initialTabs[0]?.path}`}</p>
  ),
}))

import { App } from './App'

describe('App reader entry', () => {
  it('resolves an installed catalog source start page before opening the reader', async () => {
    mocks.invokeCommand.mockResolvedValueOnce({
      sourceId: 'react',
      refName: 'main',
      path: 'README.md',
      title: 'React',
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open React reader' }))

    expect(await screen.findByText('React: README.md')).toBeInTheDocument()
    expect(mocks.invokeCommand).toHaveBeenCalledWith('get_source_start_page', { sourceId: 'react' })
  })
})
