import type { ReactNode } from 'react'

type InlineErrorProps = { message: string; action?: ReactNode }

export function InlineError({ message, action }: InlineErrorProps) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-x-coral/40 bg-x-coral/10 p-4 text-sm">
      <span>{message}</span>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
