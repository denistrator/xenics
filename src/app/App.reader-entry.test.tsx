import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invokeCommand: vi.fn(),
  nativeBridge: true,
}))

vi.mock('../lib/tauri', () => ({
  hasNativeBridge: () => mocks.nativeBridge,
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
  ReaderWorkspace: ({ initialTabs, document }: { initialTabs: Array<{ path: string; title: string }>; document?: { blocks: Array<{ text: string }> } }) => (
    <p>{`${initialTabs[0]?.title}: ${initialTabs[0]?.path}: ${document?.blocks[2]?.text ?? 'Native reader'}`}</p>
  ),
}))

import { App } from './App'

describe('App reader entry', () => {
  afterEach(() => {
    mocks.invokeCommand.mockReset()
    mocks.nativeBridge = true
  })

  it('resolves an installed catalog source start page before opening the reader', async () => {
    mocks.invokeCommand.mockResolvedValueOnce({
      sourceId: 'react',
      refName: 'main',
      path: 'README.md',
      title: 'React',
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open React reader' }))

    expect(await screen.findByText('React: README.md: Native reader')).toBeInTheDocument()
    expect(mocks.invokeCommand).toHaveBeenCalledWith('get_source_start_page', { sourceId: 'react' })
  })

  it('opens a visible reader preview when running outside the desktop bridge', async () => {
    mocks.nativeBridge = false
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open React reader' }))

    expect(await screen.findByText(/React: README.md: This is a browser preview/)).toBeInTheDocument()
    expect(mocks.invokeCommand).not.toHaveBeenCalled()
  })
})
