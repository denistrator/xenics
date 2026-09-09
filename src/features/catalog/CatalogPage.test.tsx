import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogPage } from './CatalogPage'

describe('CatalogPage', () => {
  it('renders the catalog and bulk download action', () => {
    render(<CatalogPage />)

    expect(screen.getByRole('heading', { name: /tools you build with/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download all/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'React' })).toBeInTheDocument()
  })
})
