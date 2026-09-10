import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
