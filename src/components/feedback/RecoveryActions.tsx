import type { ReactNode } from 'react'

export type RecoveryAction = {
  id: string
  label: string
  onSelect: () => void
}

export function RecoveryActions({ actions }: { actions: RecoveryAction[] }): ReactNode {
  if (actions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button key={action.id} type="button" onClick={action.onSelect} className="rounded-lg bg-x-mint px-3 py-2 text-xs font-semibold text-x-ink">
          {action.label}
        </button>
      ))}
    </div>
  )
}
