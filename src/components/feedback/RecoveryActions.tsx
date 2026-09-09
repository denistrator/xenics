type RecoveryActionsProps = { onRetry?: () => void; onOpenFolder?: () => void }

export function RecoveryActions({ onRetry, onOpenFolder }: RecoveryActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-lg bg-x-mint px-3 py-2 text-xs font-semibold text-x-ink">
          Retry
        </button>
      )}
      {onOpenFolder && (
        <button type="button" onClick={onOpenFolder} className="rounded-lg border border-x-line px-3 py-2 text-xs font-semibold">
          Open folder
        </button>
      )}
    </div>
  )
}
