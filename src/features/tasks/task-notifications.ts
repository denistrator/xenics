import { isTerminalTaskState, type TaskEvent } from '../../lib/contracts'

export type NotificationContext = {
  appFocused: boolean
  enabled: boolean
}

export type TaskNotification = {
  title: string
  body: string
}

export function shouldNotifyTask(event: TaskEvent, context: NotificationContext): boolean {
  return isTerminalTaskState(event.state) && event.state !== 'Canceled' && context.enabled && !context.appFocused
}

export function taskNotification(event: TaskEvent): TaskNotification {
  if (event.state === 'Failed' || event.state === 'Interrupted') {
    return { title: 'Xenics', body: 'Task failed. Open notifications for details.' }
  }
  if (event.state === 'SucceededWithWarnings') {
    return { title: 'Xenics', body: 'Task completed with warnings. Open notifications for details.' }
  }
  return { title: 'Xenics', body: 'Task completed.' }
}
