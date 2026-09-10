import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SearchPage } from './SearchPage'

describe('SearchPage', () => {
  it('distinguishes incomplete indexing from completed zero results', () => {
    render(
      <SearchPage
        response={{ query: 'hooks', results: [], coverage: { complete: false, indexed: 3, total: 5 } }}
        onOpen={() => undefined}
        query="hooks"
        onQueryChange={() => undefined}
      />,
    )

    expect(screen.getByText(/2 still indexing/i)).toBeInTheDocument()
    expect(screen.queryByText(/no results/i)).not.toBeInTheDocument()
  })
})
