import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryActions } from './RecoveryActions'

describe('RecoveryActions', () => {
  it('renders only the actions supplied by the failure contract', () => {
    const onRetry = vi.fn()
    render(<RecoveryActions actions={[{ id: 'retry', label: 'Retry indexing', onSelect: onRetry }]} />)

    screen.getByRole('button', { name: 'Retry indexing' }).click()

    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
