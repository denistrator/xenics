import { useCallback, useState } from 'react'
import type { TaskId } from '../../lib/contracts'
import type { TaskSnapshot } from './task-model'
import { canRetryTask } from './task-model'

export function useTaskActions(initialTasks: TaskSnapshot[]) {
  const [tasks, setTasks] = useState<TaskSnapshot[]>(() => initialTasks)

  const cancelTask = useCallback((taskId: TaskId): void => {
    setTasks((current) => current.map((task) => (
      task.taskId === taskId ? { ...task, state: 'Canceling' } : task
    )))
  }, [])

  const retryTask = useCallback((taskId: TaskId): void => {
    setTasks((current) => current.map((task) => (
      task.taskId === taskId && canRetryTask(task)
        ? {
            ...task,
            state: 'Queued',
            phase: 'queued',
            error: undefined,
            attempts: task.attempts + 1,
          }
        : task
    )))
  }, [])

  return { tasks, cancelTask, retryTask }
}
