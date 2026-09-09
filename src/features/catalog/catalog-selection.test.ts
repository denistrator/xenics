import { describe, expect, it } from 'vitest'
import { selectRange } from './catalog-selection'

describe('catalog selection', () => {
  it('selects a Shift range without selecting unavailable website entries', () => {
    expect(
      selectRange(
        [
          { id: 'react' },
          { id: 'typescript' },
          { id: 'website', selectable: false },
          { id: 'vue' },
        ],
        0,
        3,
      ),
    ).toEqual(['react', 'typescript', 'vue'])
  })
})
