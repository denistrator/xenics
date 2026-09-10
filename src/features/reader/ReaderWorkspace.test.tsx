import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { ReaderWorkspace } from './ReaderWorkspace'
const tab = { id: 'react:README.md', sourceId: 'react', refName: 'main', path: 'README.md', title: 'React', pinned: false, history: ['README.md'] }
const readerDocument = {
  title: 'React',
  source: 'React · main',
  blocks: [
    { type: 'heading' as const, text: 'useEffect', level: 2 },
    { type: 'paragraph' as const, text: 'Installation steps' },
    { type: 'warning' as const, text: 'Unsupported component' },
  ],
}

describe('ReaderWorkspace', () => {
  it('renders tabs and safe unsupported-content warnings', () => {
    render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} />)

    expect(screen.getByRole('tab', { name: 'React' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/unsupported component/i)).toBeInTheDocument()
    expect(globalThis.document.querySelector('script')).toBeNull()
  })

  it('opens an internal link in the current tab', () => {
    render(
      <ReaderWorkspace
        initialTabs={[tab]}
        document={{
          ...readerDocument,
          links: [{ label: 'useEffect', target: 'hooks/use-effect.md' }],
          blocks: [
            { type: 'paragraph' as const, text: '[useEffect](hooks/use-effect.md)' },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'useEffect' }))

    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: /useEffect/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('supports back and forward navigation within the active tab', () => {
    render(
      <ReaderWorkspace
        initialTabs={[tab]}
        document={{
          ...readerDocument,
          links: [{ label: 'useEffect', target: 'hooks/use-effect.md' }],
          blocks: [{ type: 'paragraph' as const, text: '[useEffect](hooks/use-effect.md)' }],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'useEffect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Go forward' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Go forward' }))
    expect(screen.getByRole('tab', { name: /useEffect/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps reader zoom within accessible bounds', () => {
    render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByLabelText('Reader zoom')).toHaveTextContent('110%')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByLabelText('Reader zoom')).toHaveTextContent('100%')
  })

  it('routes external links through the browser callback', () => {
    const onOpenExternalUrl = vi.fn()
    render(<ReaderWorkspace initialTabs={[tab]} document={{ ...readerDocument, links: [{ label: 'React site', target: 'https://react.dev' }], blocks: [{ type: 'paragraph' as const, text: '[React site](https://react.dev)' }] }} onOpenExternalUrl={onOpenExternalUrl} />)
    fireEvent.click(screen.getByRole('link', { name: 'React site' }))
    expect(onOpenExternalUrl).toHaveBeenCalledWith('https://react.dev')
  })

  it('copies a deep link for the active document', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy deep link' }))
    })
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('xenics://docs/react?ref=main&path=README.md'))
  })

  it('exposes source folder and source URL actions for the active tab', () => {
    const onOpenSourceFolder = vi.fn()
    const onOpenSourceUrl = vi.fn()
    render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} onOpenSourceFolder={onOpenSourceFolder} onOpenSourceUrl={onOpenSourceUrl} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open source folder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open source URL' }))
    expect(onOpenSourceFolder).toHaveBeenCalledWith('react')
    expect(onOpenSourceUrl).toHaveBeenCalledWith('react')
  })

  it('exposes the active source file action with its relative path', () => {
    const onOpenSourceFile = vi.fn()
    render(<ReaderWorkspace initialTabs={[tab]} document={readerDocument} onOpenSourceFile={onOpenSourceFile} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open source file' }))
    expect(onOpenSourceFile).toHaveBeenCalledWith('react', 'README.md')
  })
})
