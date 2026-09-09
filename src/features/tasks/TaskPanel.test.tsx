import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TaskId } from '../../lib/contracts'
import { TaskPanel } from './TaskPanel'

const failedTask = {
  taskId: 'task-index' as TaskId,
  sequence: 1,
  phase: 'indexing',
  state: 'Failed' as const,
  attempts: 1,
  error: {
    code: 'Unknown' as const,
    retryClass: 'NeedsAction' as const,
    message: 'Indexing failed',
    actions: ['retry'],
    diagnosticId: 'diag-1',
  },
}

describe('TaskPanel', () => {
  it('keeps a failed indexing task actionable without disabling reading', () => {
    const onRetry = vi.fn()
    render(<TaskPanel tasks={[failedTask]} onRetry={onRetry} />)

    expect(screen.getByRole('button', { name: /retry indexing/i })).toBeInTheDocument()
    expect(screen.getByText(/indexing failed/i)).toBeInTheDocument()
    screen.getByRole('button', { name: /retry indexing/i }).click()
    expect(onRetry).toHaveBeenCalledWith('task-index')
  })
})
