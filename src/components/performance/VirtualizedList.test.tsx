import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualizedList } from './VirtualizedList'

describe('VirtualizedList', () => {
  it('uses windowed rendering for collections above the threshold', () => {
    render(<VirtualizedList items={Array.from({ length: 20 }, (_, index) => index)} renderItem={(item) => <span>{item}</span>} />)

    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
  })

  it('keeps small collections as a simple list', () => {
    render(<VirtualizedList items={[1, 2]} renderItem={(item) => <span>{item}</span>} />)

    expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
