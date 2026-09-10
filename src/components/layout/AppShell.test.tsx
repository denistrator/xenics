import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('provides primary navigation and notification access', () => {
    render(<AppShell>content</AppShell>)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument()
  })

  it('opens a notification panel with recent task activity', async () => {
    render(<AppShell notifications={[{ taskId: 'task-1' as never, sequence: 1, phase: 'Indexing', state: 'Running', attempts: 1 } as never]}>content</AppShell>)
    await act(async () => {
      screen.getByRole('button', { name: 'Open notifications' }).click()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
      expect(screen.getByText('Indexing')).toBeInTheDocument()
    })
  })

  it('shows progress feedback and keeps active tasks cancelable', async () => {
    const onCancelTask = vi.fn()
    render(<AppShell notifications={[{ taskId: 'task-1' as never, sequence: 1, phase: 'Indexing', state: 'Running', attempts: 1 } as never]} onCancelTask={onCancelTask}>content</AppShell>)
    await act(async () => {
      screen.getByRole('button', { name: 'Open notifications' }).click()
    })
    expect(screen.getByLabelText('In progress')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Cancel' }).click()
    expect(onCancelTask).toHaveBeenCalledWith('task-1')
  })
})
