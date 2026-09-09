import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function InlineError({ message, children }: { message: string; children?: ReactNode }): ReactNode {
  return (
    <div role="alert" className="rounded-xl border border-x-coral/40 bg-x-coral/10 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
        <p>{message}</p>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
