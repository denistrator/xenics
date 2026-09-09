import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { parseTaskEvent, type TaskEvent, type TaskState } from './contracts'

export function subscribeToTaskEvents(
  taskId: string,
  onEvent: (event: TaskEvent) => void,
  previousState: TaskState = 'Queued',
  previousSequence = 0,
): Promise<UnlistenFn> {
  let state = previousState
  let sequence = previousSequence
  return listen<unknown>(`task://${taskId}`, (event) => {
    const parsed = parseTaskEvent(event.payload, state, sequence)
    state = parsed.state
    sequence = parsed.sequence
    onEvent(parsed)
  })
}
