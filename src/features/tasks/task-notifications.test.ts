import { describe, expect, it } from 'vitest'
import type { TaskEvent } from '../../lib/contracts'
import { shouldNotifyTask, taskNotification } from './task-notifications'

const event = (state: TaskEvent['state']): TaskEvent => ({
  taskId: 'task-1' as TaskEvent['taskId'],
  sequence: 2,
  phase: state === 'Failed' ? 'failed' : 'complete',
  state,
})

describe('task notifications', () => {
  it('notifies terminal outcomes only while the app is unfocused and enabled', () => {
    expect(shouldNotifyTask(event('Succeeded'), { appFocused: false, enabled: true })).toBe(true)
    expect(shouldNotifyTask(event('Failed'), { appFocused: false, enabled: true })).toBe(true)
    expect(shouldNotifyTask(event('Running'), { appFocused: false, enabled: true })).toBe(false)
    expect(shouldNotifyTask(event('Succeeded'), { appFocused: true, enabled: true })).toBe(false)
    expect(shouldNotifyTask(event('Succeeded'), { appFocused: false, enabled: false })).toBe(false)
  })

  it('creates concise success and failure notification copy', () => {
    expect(taskNotification(event('Succeeded'))).toEqual({ title: 'Xenics', body: 'Task completed.' })
    expect(taskNotification(event('Failed'))).toEqual({ title: 'Xenics', body: 'Task failed. Open notifications for details.' })
  })
})
