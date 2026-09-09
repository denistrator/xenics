import { isTerminalTaskState, type TaskEvent } from '../../lib/contracts'
import type { TaskSnapshot as TaskSnapshotModel } from './task-model'

export type TaskSnapshot = TaskSnapshotModel

export function mergeTaskEvent(current: TaskSnapshot, event: TaskEvent): TaskSnapshot {
  if (event.taskId !== current.taskId || event.sequence <= current.sequence) {
    return current
  }
  if (isTerminalTaskState(current.state)) {
    return current
  }
  return {
    ...current,
    ...event,
  }
}
