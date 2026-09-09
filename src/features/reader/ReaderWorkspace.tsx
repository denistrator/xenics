import { Copy, Pin, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { DocumentView, type ReaderDocument } from './DocumentView'
import { closeTab, duplicateTab, pinTab, type ReaderTab } from './tab-state'

type ReaderWorkspaceProps = { initialTabs: ReaderTab[]; document: ReaderDocument }

export function ReaderWorkspace({ initialTabs, document }: ReaderWorkspaceProps) {
  const [tabs, setTabs] = useState(initialTabs)
  const [activeTabId, setActiveTabId] = useState(initialTabs[0]?.id)
  const [closedTabs, setClosedTabs] = useState<ReaderTab[]>([])
  const currentTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  function handleClose(tabId: string) {
    const result = closeTab(tabs, tabId)
    setTabs(result.tabs)
    if (result.closed) setClosedTabs((current) => [result.closed!, ...current])
    setActiveTabId(result.tabs[0]?.id)
  }

  function reopenClosedTab() {
    const [tab, ...remaining] = closedTabs
    if (!tab) return
    setTabs((current) => [...current, tab])
    setClosedTabs(remaining)
    setActiveTabId(tab.id)
  }

  function duplicateCurrentTab() {
    if (!currentTab) return
    const nextTabs = duplicateTab(tabs, currentTab.id)
    setTabs(nextTabs)
    setActiveTabId(nextTabs[nextTabs.length - 1]?.id)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-x-line bg-x-panel">
      <header className="flex items-center gap-2 overflow-x-auto border-b border-x-line bg-x-paper px-3 pt-3" role="tablist" aria-label="Open documents">
        {tabs.map((tab) => (
          <div key={tab.id} role="tab" aria-selected={tab.id === currentTab?.id} className={`flex min-w-fit items-center gap-2 rounded-t-xl px-4 py-3 text-sm ${tab.id === currentTab?.id ? 'bg-x-panel font-semibold' : 'text-x-muted'}`}>
            <button onClick={() => setActiveTabId(tab.id)}>{tab.title}</button>
            {tab.pinned && <Pin size={13} />}
            <button aria-label={`Close ${tab.title}`} onClick={() => handleClose(tab.id)}><X size={14} /></button>
          </div>
        ))}
        <button aria-label="Reopen closed tab" onClick={reopenClosedTab} className="ml-auto rounded-lg p-2 text-x-muted hover:bg-x-paper"><RotateCcw size={16} /></button>
      </header>

      {currentTab && (
        <div className="flex justify-end gap-1 border-b border-x-line px-5 py-2">
          <button aria-label="Duplicate tab" onClick={duplicateCurrentTab} className="rounded-lg p-2 text-x-muted hover:bg-x-paper"><Copy size={15} /></button>
          <button aria-label="Pin tab" onClick={() => setTabs((current) => pinTab(current, currentTab.id))} className="rounded-lg p-2 text-x-muted hover:bg-x-paper"><Pin size={15} /></button>
        </div>
      )}

      {currentTab ? <div className="p-6 md:p-10"><DocumentView document={document} /></div> : <p className="p-10 text-x-muted">Open a document to start reading.</p>}
    </section>
  )
}
