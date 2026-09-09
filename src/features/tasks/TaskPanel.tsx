import type { TaskId } from '../../lib/contracts'
import type { ReactNode } from 'react'
import type { TaskSnapshot } from './task-model'
import { TaskRow } from './TaskRow'

type TaskPanelProps = {
  tasks: TaskSnapshot[]
  onCancel?: (taskId: TaskId) => void
  onRetry?: (taskId: TaskId) => void
}

export function TaskPanel({ tasks, onCancel, onRetry }: TaskPanelProps): ReactNode {
  return (
    <section aria-labelledby="tasks-title" className="space-y-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Activity</p>
        <h2 id="tasks-title" className="mt-1 font-display text-3xl tracking-tight">Tasks</h2>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-x-line bg-x-panel p-6 text-sm text-x-muted">
          No recent tasks.
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow key={task.taskId} task={task} onCancel={onCancel} onRetry={onRetry} />
          ))}
        </div>
      )}
    </section>
  )
}
