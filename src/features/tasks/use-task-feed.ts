import { useCallback, useEffect, useState } from 'react'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import type { TaskEvent, TaskId } from '../../lib/contracts'
import { isTerminalTaskState } from '../../lib/contracts'
import { invokeCommand } from '../../lib/tauri'
import { subscribeToTaskEvents } from '../../lib/task-events'
import { isActiveTask } from './task-model'
import { mergeTaskEvent, type TaskSnapshot } from './task-feed'
import { shouldNotifyTask, taskNotification } from './task-notifications'

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
    const notifiedTasks = new Set<string>()
    let notificationsEnabled = true

    async function notifyTask(event: TaskEvent): Promise<void> {
      if (!shouldNotifyTask(event, {
        appFocused: document.visibilityState === 'visible' && document.hasFocus(),
        enabled: notificationsEnabled,
      }) || notifiedTasks.has(event.taskId)) return
      notifiedTasks.add(event.taskId)
      try {
        let permissionGranted = await isPermissionGranted()
        if (!permissionGranted) permissionGranted = await requestPermission() === 'granted'
        if (permissionGranted) sendNotification(taskNotification(event))
      } catch {
        // Notification permission or delivery failures do not affect task state.
      }
    }

    async function loadTasks(): Promise<void> {
      try {
        const settings = await invokeCommand<Record<string, unknown>>('get_settings')
        if (typeof settings.notificationsEnabled === 'boolean') notificationsEnabled = settings.notificationsEnabled
        const snapshots = await invokeCommand<NativeTaskSnapshot[]>('get_tasks')
        if (disposed) return
        const initialTasks = snapshots.map(toTaskSnapshot)
        setTasks(initialTasks)

        await Promise.all(initialTasks.filter(isActiveTask).map(async (task) => {
          const stopListening = await subscribeToTaskEvents(
            task.taskId,
            (event: TaskEvent) => {
              if (!isTerminalTaskState(event.state)) notifiedTasks.delete(event.taskId)
              else void notifyTask(event)
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
