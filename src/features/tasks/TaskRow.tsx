import { Ban, RotateCcw } from 'lucide-react'
import type { TaskId } from '../../lib/contracts'
import { canRetryTask, recoveryMessage, taskStateLabel, type TaskSnapshot } from './task-model'

type TaskRowProps = {
  task: TaskSnapshot
  onCancel?: (taskId: TaskId) => void
  onRetry?: (taskId: TaskId) => void
}

export function TaskRow({ task, onCancel, onRetry }: TaskRowProps) {
  const retryable = canRetryTask(task)
  const active = !['Succeeded', 'SucceededWithWarnings', 'Failed', 'Canceled', 'Interrupted'].includes(task.state)

  return (
    <article className="rounded-xl border border-x-line bg-x-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{task.phase}</p>
          <p className="mt-1 text-xs text-x-muted">{taskStateLabel(task.state)} · attempt {task.attempts}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {active && onCancel && <button type="button" onClick={() => onCancel(task.taskId)} className="rounded-lg border border-x-line px-3 py-2 text-xs font-semibold"><Ban size={14} className="mr-1 inline" />Cancel</button>}
          {retryable && onRetry && <button type="button" onClick={() => onRetry(task.taskId)} className="rounded-lg bg-x-mint px-3 py-2 text-xs font-semibold text-x-ink"><RotateCcw size={14} className="mr-1 inline" />Retry {task.phase}</button>}
        </div>
      </div>
      {task.progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-x-paper"><div className="h-full rounded-full bg-x-mint" style={{ width: `${task.progress * 100}%` }} /></div>}
      {task.error && <p role="alert" className="mt-3 text-sm text-x-coral">{recoveryMessage(task.error)}</p>}
    </article>
  )
}
