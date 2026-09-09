import { describe, expect, it } from 'vitest'
import { parseTaskEvent, TaskState } from './contracts'

describe('task contracts', () => {
  it('rejects an event that moves a terminal task back to running', () => {
    expect(() => parseTaskEvent({ taskId: 'task-1', sequence: 2, state: 'Running' }, 'Succeeded')).toThrow()
  })

  it('rejects an event with a stale sequence number', () => {
    expect(() => parseTaskEvent({ taskId: 'task-1', sequence: 2, state: 'Succeeded' }, 'Running', 2)).toThrow()
  })

  it('accepts a newer terminal event and preserves its typed state', () => {
    const event = parseTaskEvent({ taskId: 'task-1', sequence: 3, state: 'Succeeded' }, 'Running', 2)
    const state: TaskState = event.state
    expect(state).toBe('Succeeded')
  })
})
