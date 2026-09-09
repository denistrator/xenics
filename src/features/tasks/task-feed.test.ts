import { describe, expect, it } from 'vitest'
import type { TaskEvent, TaskId } from '../../lib/contracts'
import { mergeTaskEvent, type TaskSnapshot } from './task-feed'

const task: TaskSnapshot = {
  taskId: 'task-1' as TaskId,
  sequence: 2,
  phase: 'running',
  state: 'Running',
  attempts: 1,
}

function event(overrides: Partial<TaskEvent>): TaskEvent {
  return {
    taskId: task.taskId,
    sequence: 3,
    phase: 'indexing',
    state: 'Running',
    ...overrides,
  }
}

describe('task feed', () => {
  it('ignores stale events', () => {
    expect(mergeTaskEvent(task, event({ sequence: 2, phase: 'old' }))).toBe(task)
  })

  it('does not reopen a terminal task', () => {
    const completed = { ...task, sequence: 4, state: 'Succeeded' as const }
    expect(mergeTaskEvent(completed, event({ sequence: 5, state: 'Running' }))).toBe(completed)
  })

  it('applies newer state and preserves attempt metadata', () => {
    expect(mergeTaskEvent(task, event({ sequence: 3, state: 'Succeeded', phase: 'complete' }))).toEqual({
      ...task,
      sequence: 3,
      state: 'Succeeded',
      phase: 'complete',
    })
  })
})
