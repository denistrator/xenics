import { Ban } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TaskId } from '../../lib/contracts'
import { InlineError } from '../../components/feedback/InlineError'
import { RecoveryActions } from '../../components/feedback/RecoveryActions'
import { canRetryTask, isActiveTask, recoveryMessage, taskStateLabel, type TaskSnapshot } from './task-model'

type TaskRowProps = {
  task: TaskSnapshot
  onCancel?: (taskId: TaskId) => void
  onRetry?: (taskId: TaskId) => void
}

export function TaskRow({ task, onCancel, onRetry }: TaskRowProps): ReactNode {
  const retryable = canRetryTask(task)
  const active = isActiveTask(task)
  const progress = task.progress === undefined
    ? undefined
    : Math.min(Math.max(task.progress, 0), 1)
  const errorMessage = recoveryMessage(task.error)

  return (
    <article className="rounded-xl border border-x-line bg-x-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{task.phase}</p>
          <p className="mt-1 text-xs text-x-muted">
            {taskStateLabel(task.state)} · attempt {task.attempts}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {active && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(task.taskId)}
              className="rounded-lg border border-x-line px-3 py-2 text-xs font-semibold"
            >
              <Ban aria-hidden="true" className="mr-1 inline" size={14} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {progress !== undefined && (
        <progress
          className="mt-3 block h-1.5 w-full overflow-hidden rounded-full accent-x-mint"
          value={progress}
          max={1}
          aria-label={`${task.phase} progress`}
        />
      )}
      {errorMessage && (
        <InlineError message={errorMessage}>
          {retryable && onRetry && (
            <RecoveryActions
              actions={[{
                id: 'retry',
                label: `Retry ${task.phase}`,
                onSelect: () => onRetry(task.taskId),
              }]}
            />
          )}
        </InlineError>
      )}
    </article>
  )
}
