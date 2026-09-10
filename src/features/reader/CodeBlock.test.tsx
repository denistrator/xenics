import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('shows line numbers and toggles wrapping accessibly', () => {
    render(<CodeBlock code={'const first = 1\nconst second = 2'} language="ts" />)

    expect(screen.getByText('1', { selector: '[data-line-number="true"]' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable line wrapping' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Enable line wrapping' }))
    expect(screen.getByRole('button', { name: 'Disable line wrapping' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('syntax-highlights supported languages without changing the source code', () => {
    render(<CodeBlock code="const ready = true" language="javascript" />)

    expect(screen.getByRole('code')).toHaveAttribute('data-syntax-highlighted', 'true')
    expect(screen.getByRole('code').querySelector('.hljs-keyword')).toHaveTextContent('const')
    expect(screen.getByRole('code')).toHaveTextContent('const ready = true')
  })

  it('keeps untrusted code as text while highlighting it', () => {
    render(<CodeBlock code={'const value = "<script>bad()</script>"'} language="javascript" />)

    expect(screen.getByRole('code').querySelector('script')).toBeNull()
    expect(screen.getByRole('code')).toHaveTextContent('<script>bad()</script>')
  })
})
