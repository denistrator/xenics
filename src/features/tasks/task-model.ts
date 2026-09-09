import type { TaskEvent, TaskState, XenicsError } from '../../lib/contracts'

export type TaskSnapshot = TaskEvent & {
  attempts: number
  startedAt?: string
  finishedAt?: string
}

export function canRetryTask(task: TaskSnapshot) {
  return task.state === 'Failed' || task.state === 'Interrupted' || task.state === 'NeedsAction'
}

export function taskStateLabel(state: TaskState) {
  return state.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function recoveryMessage(error?: XenicsError) {
  if (!error) return null
  if (error.code === 'GitAuthentication') return 'Authentication is required before this task can continue.'
  return error.message || 'The task could not be completed.'
}
