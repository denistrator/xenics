import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('shows line numbers and toggles wrapping accessibly', () => {
    render(<CodeBlock code={'const first = 1\nconst second = 2'} language="ts" />)

    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable line wrapping' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Enable line wrapping' }))
    expect(screen.getByRole('button', { name: 'Disable line wrapping' })).toHaveAttribute('aria-pressed', 'true')
  })
})
