import { Copy, Pin, RotateCcw, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DocumentView, type ReaderDocument } from './DocumentView'
import { closeTab, duplicateTab, pinTab, type ReaderTab } from './tab-state'

type ReaderWorkspaceProps = {
  initialTabs: ReaderTab[]
  document: ReaderDocument
}

export function ReaderWorkspace({ initialTabs, document }: ReaderWorkspaceProps): ReactNode {
  const [tabs, setTabs] = useState<ReaderTab[]>(() => initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(() => initialTabs[0]?.id)
  const [closedTabs, setClosedTabs] = useState<ReaderTab[]>([])
  const currentTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  function handleCloseTab(tabId: string): void {
    const closedIndex = tabs.findIndex((tab) => tab.id === tabId)
    const result = closeTab(tabs, tabId)

    setTabs(result.tabs)
    if (result.closed) setClosedTabs((current) => [result.closed!, ...current])

    if (tabId === activeTabId) {
      const nextTab = result.tabs[Math.min(closedIndex, result.tabs.length - 1)]
      setActiveTabId(nextTab?.id)
    }
  }

  function reopenClosedTab(): void {
    const [tab, ...remaining] = closedTabs
    if (!tab) return

    setTabs((current) => [...current, tab])
    setClosedTabs(remaining)
    setActiveTabId(tab.id)
  }

  function duplicateCurrentTab(): void {
    if (!currentTab) return

    const nextTabs = duplicateTab(tabs, currentTab.id)
    setTabs(nextTabs)
    setActiveTabId(nextTabs[nextTabs.length - 1]?.id)
  }

  function toggleCurrentTabPin(): void {
    if (currentTab) setTabs((current) => pinTab(current, currentTab.id))
  }

  function focusAdjacentTab(currentTabId: string, direction: -1 | 1): void {
    if (tabs.length === 0) return

    const currentIndex = tabs.findIndex((tab) => tab.id === currentTabId)
    if (currentIndex < 0) return

    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex]
    if (!nextTab) return

    setActiveTabId(nextTab.id)
    window.requestAnimationFrame(() => globalThis.document.getElementById(`tab-${nextTab.id}`)?.focus())
  }

  function focusTabByEdge(edge: 'first' | 'last'): void {
    const nextTab = edge === 'first' ? tabs[0] : tabs[tabs.length - 1]
    if (!nextTab) return

    setActiveTabId(nextTab.id)
    window.requestAnimationFrame(() => globalThis.document.getElementById(`tab-${nextTab.id}`)?.focus())
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-x-line bg-x-panel">
      <header
        className="flex items-center gap-2 overflow-x-auto border-b border-x-line bg-x-paper px-3 pt-3"
        role="tablist"
        aria-label="Open documents"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentTab?.id

          return (
            <div
              key={tab.id}
              role="presentation"
              className={`flex min-w-fit items-center gap-2 rounded-t-xl px-4 py-3 text-sm ${isActive ? 'bg-x-panel font-semibold' : 'text-x-muted'}`}
            >
              <button
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    focusAdjacentTab(tab.id, 1)
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    focusAdjacentTab(tab.id, -1)
                  } else if (event.key === 'Home') {
                    event.preventDefault()
                    focusTabByEdge('first')
                  } else if (event.key === 'End') {
                    event.preventDefault()
                    focusTabByEdge('last')
                  }
                }}
              >
                {tab.title}
              </button>
              {tab.pinned && <Pin aria-hidden="true" size={13} />}
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={() => handleCloseTab(tab.id)}
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          )
        })}
        <div className="ml-auto flex shrink-0 gap-1" role="toolbar" aria-label="Tab actions">
          <button type="button" aria-label="Reopen closed tab" onClick={reopenClosedTab} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <RotateCcw aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Duplicate active tab" onClick={duplicateCurrentTab} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <Copy aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Pin active tab" onClick={toggleCurrentTabPin} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <Pin aria-hidden="true" size={15} />
          </button>
        </div>
      </header>

      {currentTab ? (
        <div id={`panel-${currentTab.id}`} role="tabpanel" aria-labelledby={`tab-${currentTab.id}`} className="p-6 md:p-10">
          <DocumentView document={document} />
        </div>
      ) : (
        <p className="p-10 text-x-muted">Open a document to start reading.</p>
      )}
    </section>
  )
}
