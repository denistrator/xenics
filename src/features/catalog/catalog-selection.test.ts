import { describe, expect, it } from 'vitest'
import { defaultDownloadSelection, selectRange } from './catalog-selection'

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

  it('does not preselect files-only or website-only sources for documentation downloads', () => {
    expect(defaultDownloadSelection([
      { id: 'react', capability: 'Readable' },
      { id: 'sqlite', capability: 'Files only' },
      { id: 'website', capability: 'Website only' },
    ])).toEqual(['react'])
  })
})
