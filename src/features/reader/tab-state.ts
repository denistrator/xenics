export type ReaderTarget = { sourceId: string; refName: string; path: string; title: string }
export type ReaderTab = ReaderTarget & { id: string; pinned: boolean; history: string[] }
export function openTab(tabs: ReaderTab[], target: ReaderTarget): ReaderTab[] { return [...tabs, { ...target, id: `${target.sourceId}:${target.path}`, pinned: false, history: [target.path] }] }
export function closeTab(tabs: ReaderTab[], id: string): { tabs: ReaderTab[]; closed?: ReaderTab } { const closed = tabs.find((tab) => tab.id === id); return { tabs: tabs.filter((tab) => tab.id !== id), closed } }
export function duplicateTab(tabs: ReaderTab[], id: string): ReaderTab[] { const tab = tabs.find((value) => value.id === id); return tab ? [...tabs, { ...tab, id: `${tab.id}:copy`, history: [...tab.history] }] : tabs }
export function pinTab(tabs: ReaderTab[], id: string): ReaderTab[] { return tabs.map((tab) => tab.id === id ? { ...tab, pinned: !tab.pinned } : tab) }
export function reorderTabs(tabs: ReaderTab[], order: string[]): ReaderTab[] { const byId = new Map(tabs.map((tab) => [tab.id, tab])); return order.flatMap((id) => { const tab = byId.get(id); return tab ? [tab] : [] }) }
