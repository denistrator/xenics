import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('provides primary navigation and notification access', () => {
    render(<AppShell>content</AppShell>)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument()
  })
})
