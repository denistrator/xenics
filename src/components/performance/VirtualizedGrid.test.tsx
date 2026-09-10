import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualizedGrid } from './VirtualizedGrid'

describe('VirtualizedGrid', () => {
  it('uses windowed rows for collections above the threshold', () => {
    render(
      <VirtualizedGrid
        items={Array.from({ length: 20 }, (_, index) => index)}
        renderItem={(item) => <span>{item}</span>}
      />,
    )

    expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
  })

  it('keeps small collections as a simple responsive grid', () => {
    render(<VirtualizedGrid items={[1, 2]} renderItem={(item) => <span>{item}</span>} />)

    expect(screen.queryByTestId('virtualized-grid')).not.toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
