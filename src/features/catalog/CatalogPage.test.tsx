import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogPage } from './CatalogPage'

describe('CatalogPage', () => {
  it('renders the catalog and bulk download action', () => {
    render(<CatalogPage />)

    expect(screen.getByRole('heading', { name: /tools you build with/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download all/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'React' })).toBeInTheDocument()
  })

  it('filters repositories without losing the bulk download contract', async () => {
    render(<CatalogPage />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search repositories' }), {
      target: { value: 'rust' },
    })

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rust' })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'React' })).not.toBeInTheDocument()
    expect(screen.getByText('1 technology')).toBeInTheDocument()
  })

  it('delegates bulk downloads and exposes the completed state', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined)
    render(<CatalogPage onDownload={onDownload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download all' }))

    await waitFor(() => expect(onDownload).toHaveBeenCalledWith([
      'react',
      'typescript',
      'rust',
      'tauri',
      'tailwind',
      'sqlite',
    ]))
    expect(await screen.findByRole('button', { name: 'Downloads queued' })).toBeInTheDocument()
  })
})
