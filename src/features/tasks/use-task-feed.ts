import { useCallback, useEffect, useState } from 'react'
import type { TaskEvent, TaskId } from '../../lib/contracts'
import { invokeCommand } from '../../lib/tauri'
import { subscribeToTaskEvents } from '../../lib/task-events'
import { isActiveTask } from './task-model'
import { mergeTaskEvent, type TaskSnapshot } from './task-feed'

type NativeTaskSnapshot = Omit<TaskSnapshot, 'sequence' | 'progress'> & {
  sequence?: number
}

function toTaskSnapshot(snapshot: NativeTaskSnapshot): TaskSnapshot {
  return {
    ...snapshot,
    sequence: snapshot.sequence ?? 0,
  }
}

export function useTaskFeed(): {
  tasks: TaskSnapshot[]
  cancelTask: (taskId: TaskId) => Promise<void>
  retryTask: (taskId: TaskId) => Promise<void>
} {
  const [tasks, setTasks] = useState<TaskSnapshot[]>([])

  useEffect(() => {
    let disposed = false
    const unsubscribe = new Set<() => void>()

    async function loadTasks(): Promise<void> {
      try {
        const snapshots = await invokeCommand<NativeTaskSnapshot[]>('get_tasks')
        if (disposed) return
        const initialTasks = snapshots.map(toTaskSnapshot)
        setTasks(initialTasks)

        await Promise.all(initialTasks.filter(isActiveTask).map(async (task) => {
          const stopListening = await subscribeToTaskEvents(
            task.taskId,
            (event: TaskEvent) => {
              setTasks((current) => current.map((candidate) => (
                candidate.taskId === event.taskId
                  ? mergeTaskEvent(candidate, event)
                  : candidate
              )))
            },
            task.state,
            task.sequence,
          )
          if (disposed) stopListening()
          else unsubscribe.add(stopListening)
        }))
      } catch {
        // An unavailable native bridge leaves the empty task feed unchanged.
      }
    }

    void loadTasks()
    return () => {
      disposed = true
      unsubscribe.forEach((stopListening) => stopListening())
    }
  }, [])

  const cancelTask = useCallback(async (taskId: TaskId): Promise<void> => {
    await invokeCommand('cancel_task', { taskId })
  }, [])

  const retryTask = useCallback(async (taskId: TaskId): Promise<void> => {
    await invokeCommand('retry_task', { taskId })
  }, [])

  return { tasks, cancelTask, retryTask }
}
