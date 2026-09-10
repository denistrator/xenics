export type ReaderTarget = {
  sourceId: string
  refName: string
  path: string
  title: string
}

export type ReaderTab = ReaderTarget & {
  id: string
  pinned: boolean
  history: string[]
}

function getBaseTabId(target: ReaderTarget): string {
  return `${target.sourceId}:${target.path}`
}

function getUniqueTabId(tabs: ReaderTab[], baseId: string): string {
  if (!tabs.some((tab) => tab.id === baseId)) return baseId

  let copyNumber = 2
  while (tabs.some((tab) => tab.id === `${baseId}:copy-${copyNumber}`)) copyNumber += 1
  return `${baseId}:copy-${copyNumber}`
}

export function openTab(tabs: ReaderTab[], target: ReaderTarget): ReaderTab[] {
  const id = getUniqueTabId(tabs, getBaseTabId(target))
  return [...tabs, { ...target, id, pinned: false, history: [target.path] }]
}

export function closeTab(tabs: ReaderTab[], id: string): { tabs: ReaderTab[]; closed?: ReaderTab } {
  const closed = tabs.find((tab) => tab.id === id)
  return {
    tabs: tabs.filter((tab) => tab.id !== id),
    closed,
  }
}

export function closeOtherTabs(tabs: ReaderTab[], activeId: string): ReaderTab[] {
  return tabs.filter((tab) => tab.pinned || tab.id === activeId)
}

export function closeTabsToRight(tabs: ReaderTab[], activeId: string): ReaderTab[] {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeId)
  if (activeIndex < 0) return tabs

  return tabs.filter((tab, index) => index <= activeIndex || tab.pinned)
}

export function duplicateTab(tabs: ReaderTab[], id: string): ReaderTab[] {
  const tab = tabs.find((value) => value.id === id)
  if (!tab) return tabs

  const duplicate = {
    ...tab,
    id: getUniqueTabId(tabs, tab.id),
    history: [...tab.history],
  }

  return [...tabs, duplicate]
}

export function pinTab(tabs: ReaderTab[], id: string): ReaderTab[] {
  return tabs.map((tab) => (tab.id === id ? { ...tab, pinned: !tab.pinned } : tab))
}

export function reorderTabs(tabs: ReaderTab[], order: string[]): ReaderTab[] {
  const byId = new Map(tabs.map((tab) => [tab.id, tab]))
  const orderedIds = new Set<string>()
  const orderedTabs = order.flatMap((id) => {
    const tab = byId.get(id)
    if (!tab) return []
    orderedIds.add(id)
    return [tab]
  })

  return [...orderedTabs, ...tabs.filter((tab) => !orderedIds.has(tab.id))]
}
