import { describe, expect, it } from 'vitest'
import { closeTab, duplicateTab, pinTab, reorderTabs } from './tab-state'

const tab = {
  id: 'one', sourceId: 'react', refName: 'main', path: 'README.md', title: 'React', pinned: false, history: ['README.md'],
}

describe('tab state', () => {
  it('supports pin, duplicate, and reopen bookkeeping', () => {
    expect(pinTab([tab], 'one')[0].pinned).toBe(true)
    expect(duplicateTab([tab], 'one')).toHaveLength(2)
    expect(closeTab([tab], 'one').closed?.title).toBe('React')
  })

  it('keeps duplicate and reordered tab IDs unique and complete', () => {
    const duplicate = duplicateTab([tab], 'one')
    const duplicateAgain = duplicateTab(duplicate, 'one')

    expect(new Set(duplicateAgain.map((value) => value.id)).size).toBe(3)
    expect(reorderTabs(duplicateAgain, ['one'])).toHaveLength(3)
  })
})
