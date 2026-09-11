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

  it('renders typed inline content and semantic tables without HTML injection', () => {
    const onInternalLink = vi.fn()
    const onExternalLink = vi.fn()
    render(
      <DocumentView
        document={{
          title: 'Guide',
          source: 'docs',
          links: [],
          blocks: [
            {
              type: 'paragraph',
              text: 'Use Xenics init, carefully.',
              inline: [
                { type: 'text', text: 'Use ' },
                { type: 'strong', children: [{ type: 'text', text: 'Xenics' }] },
                { type: 'text', text: ' ' },
                { type: 'inlineCode', text: 'init' },
                { type: 'text', text: ', ' },
                { type: 'emphasis', children: [{ type: 'text', text: 'carefully' }] },
                { type: 'text', text: ', ' },
                { type: 'link', target: './guide.md', children: [{ type: 'text', text: 'read more' }] },
                { type: 'text', text: ', or ' },
                { type: 'link', target: 'https://xenics.dev', children: [{ type: 'text', text: 'visit Xenics' }] },
                { type: 'text', text: '.' },
              ],
            },
            {
              type: 'table',
              text: 'Feature Support Tables Ready',
              headers: [[{ type: 'text', text: 'Feature' }], [{ type: 'text', text: 'Support' }]],
              rows: [[[{ type: 'text', text: 'Tables' }], [{ type: 'strong', children: [{ type: 'text', text: 'Ready' }] }]]],
            },
          ],
        }}
        onInternalLink={onInternalLink}
        onExternalLink={onExternalLink}
      />,
    )

    expect(screen.getByText('Xenics').closest('strong')).not.toBeNull()
    expect(screen.getByText('carefully').closest('em')).not.toBeNull()
    expect(screen.getByText('init').closest('code')).not.toBeNull()
    expect(screen.getByRole('table', { name: 'Documentation table' })).toBeInTheDocument()
    screen.getByRole('link', { name: 'read more' }).click()
    screen.getByRole('link', { name: 'visit Xenics' }).click()
    expect(onInternalLink).toHaveBeenCalledWith({ label: 'read more', target: './guide.md' })
    expect(onExternalLink).toHaveBeenCalledWith({ label: 'visit Xenics', target: 'https://xenics.dev' })
  })
})
