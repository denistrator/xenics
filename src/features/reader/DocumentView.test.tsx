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
})
