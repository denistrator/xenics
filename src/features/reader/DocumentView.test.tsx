import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DocumentView } from './DocumentView'

describe('DocumentView', () => {
  it('shows an offline placeholder and browser action for unsupported embeds', () => {
    const onExternalLink = vi.fn()
    render(<DocumentView document={{ title: 'Embeds', source: 'React', blocks: [{ type: 'embed', text: 'Interactive demo', target: 'https://example.com/demo' }] }} onExternalLink={onExternalLink} />)

    expect(screen.getByText('Interactive demo')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Open in browser' }).click()
    expect(onExternalLink).toHaveBeenCalledWith({ label: 'Interactive demo', target: 'https://example.com/demo' })
  })

  it('renders local image blocks with escaped alt text', () => {
    render(<DocumentView document={{ title: 'Guide', source: 'docs', blocks: [{ type: 'image', text: 'Architecture diagram', url: './assets/architecture.png' }] }} />)
    expect(screen.getByRole('img', { name: 'Architecture diagram' })).toHaveAttribute('src', './assets/architecture.png')
  })

  it('does not load external or traversal image URLs', () => {
    render(<DocumentView document={{ title: 'Guide', source: 'docs', blocks: [
      { type: 'image', text: 'External', url: 'https://example.com/image.png' },
      { type: 'image', text: 'Traversal', url: '../outside.png' },
    ] }} />)

    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.getByText('Image unavailable offline: External')).toBeInTheDocument()
    expect(screen.getByText('Image unavailable offline: Traversal')).toBeInTheDocument()
  })
})
