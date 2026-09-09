import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('provides primary navigation and notification access', () => {
    render(<AppShell>content</AppShell>)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument()
  })

  it('opens a notification panel with recent task activity', async () => {
    render(<AppShell notifications={[{ taskId: 'task-1' as never, sequence: 1, phase: 'Indexing', state: 'Running', attempts: 1 } as never]}>content</AppShell>)
    screen.getByRole('button', { name: 'Open notifications' }).click()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
      expect(screen.getByText('Indexing')).toBeInTheDocument()
    })
  })
})
