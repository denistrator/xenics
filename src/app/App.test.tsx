import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the Xenics shell', () => {
    render(<App />)
    expect(screen.getByRole('application', { name: 'Xenics' })).toBeInTheDocument()
  })
})
