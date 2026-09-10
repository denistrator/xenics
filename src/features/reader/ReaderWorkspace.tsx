import { ArrowLeft, ArrowRight, Check, Copy, PanelLeft, Pin, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DocumentView, type ReaderDocument, type ReaderLink, type ReaderNavigationItem } from './DocumentView'
import { closeOtherTabs, closeTab, closeTabsToRight, duplicateTab, pinTab, reorderTabs, type ReaderTab } from './tab-state'
import { useReaderDocument } from './reader-hooks'
import { hasNativeBridge, invokeCommand } from '../../lib/tauri'

type ReaderWorkspaceProps = {
  initialTabs: ReaderTab[]
  document?: ReaderDocument
  onOpenExternalUrl?: (url: string) => void
  onOpenSourceFolder?: (sourceId: string) => void
  onOpenSourceUrl?: (sourceId: string) => void
  onOpenSourceFile?: (sourceId: string, path: string) => void
  onOpenSourceFileInEditor?: (sourceId: string, path: string) => void
  onOpenSourceTerminal?: (sourceId: string) => void
}

export function ReaderWorkspace({ initialTabs, document, onOpenExternalUrl, onOpenSourceFolder, onOpenSourceUrl, onOpenSourceFile, onOpenSourceFileInEditor, onOpenSourceTerminal }: ReaderWorkspaceProps): ReactNode {
  const [tabs, setTabs] = useState<ReaderTab[]>(() => initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(() => initialTabs[0]?.id)
  const [closedTabs, setClosedTabs] = useState<ReaderTab[]>([])
  const [zoom, setZoom] = useState(100)
  const [deepLinkCopied, setDeepLinkCopied] = useState(false)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const sessionHydrated = useRef(!hasNativeBridge())
  const currentTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const loadedDocument = useReaderDocument(document ? undefined : currentTab)
  const visibleDocument = document ?? loadedDocument.document

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    void invokeCommand<{ tabs?: ReaderTab[]; activeTabId?: string }>('get_reader_session')
      .then((session) => {
        if (!active || !Array.isArray(session.tabs)) return
        const validTabs = session.tabs.filter(isReaderTab)
        if (validTabs.length === 0) return
        setTabs(validTabs)
        setActiveTabId(validTabs.some((tab) => tab.id === session.activeTabId)
          ? session.activeTabId
          : validTabs[0]?.id)
        sessionHydrated.current = true
      })
      .catch(() => { sessionHydrated.current = true })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!sessionHydrated.current || !hasNativeBridge()) return
    void invokeCommand('save_reader_session', { session: { tabs, activeTabId } }).catch(() => undefined)
  }, [activeTabId, tabs])

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

  function closeOtherTabsFromWorkspace(): void {
    if (!currentTab) return
    setTabs((current) => closeOtherTabs(current, currentTab.id))
  }

  function closeTabsToRightFromWorkspace(): void {
    if (!currentTab) return
    setTabs((current) => closeTabsToRight(current, currentTab.id))
  }

  function openInternalLink(link: ReaderLink): void {
    if (!currentTab || link.target.startsWith('#')) return
    const nextPath = resolveInternalPath(currentTab.path, link.target)
    if (!nextPath) return

    setTabs((current) => current.map((tab) => tab.id === currentTab.id
      ? { ...tab, path: nextPath, title: link.label, history: [...tab.history.slice(0, tab.history.indexOf(tab.path) + 1), nextPath] }
      : tab))
  }

  function navigateHistory(direction: -1 | 1): void {
    if (!currentTab) return
    const currentIndex = currentTab.history.indexOf(currentTab.path)
    const nextPath = currentTab.history[currentIndex + direction]
    if (!nextPath) return
    setTabs((current) => current.map((tab) => tab.id === currentTab.id ? { ...tab, path: nextPath } : tab))
  }

  function openNavigationItem(item: ReaderNavigationItem): void {
    if (!currentTab || item.path === currentTab.path) return
    setTabs((current) => current.map((tab) => tab.id === currentTab.id
      ? { ...tab, path: item.path, title: item.label, history: [...tab.history.slice(0, tab.history.indexOf(tab.path) + 1), item.path] }
      : tab))
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

  function changeZoom(delta: number): void {
    setZoom((current) => Math.min(140, Math.max(80, current + delta)))
  }

  async function copyDeepLink(): Promise<void> {
    if (!currentTab || !navigator.clipboard) return
    const deepLink = `xenics://docs/${encodeURIComponent(currentTab.sourceId)}?ref=${encodeURIComponent(currentTab.refName)}&path=${encodeURIComponent(currentTab.path)}`
    try {
      await navigator.clipboard.writeText(deepLink)
      setDeepLinkCopied(true)
      window.setTimeout(() => setDeepLinkCopied(false), 1200)
    } catch {
      setDeepLinkCopied(false)
    }
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
              draggable
              onDragStart={() => setDraggedTabId(tab.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedTabId || draggedTabId === tab.id) return
                setTabs((current) => reorderTabs(current, [draggedTabId, tab.id]))
                setDraggedTabId(null)
              }}
              onDragEnd={() => setDraggedTabId(null)}
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
          <button type="button" aria-label="Go back" disabled={!currentTab || currentTab.history.indexOf(currentTab.path) <= 0} onClick={() => navigateHistory(-1)} className="rounded-lg p-2 text-x-muted hover:bg-x-panel disabled:opacity-40">
            <ArrowLeft aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Go forward" disabled={!currentTab || currentTab.history.indexOf(currentTab.path) >= (currentTab.history.length - 1)} onClick={() => navigateHistory(1)} className="rounded-lg p-2 text-x-muted hover:bg-x-panel disabled:opacity-40">
            <ArrowRight aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Reopen closed tab" onClick={reopenClosedTab} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <RotateCcw aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Duplicate active tab" onClick={duplicateCurrentTab} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <Copy aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Pin active tab" onClick={toggleCurrentTabPin} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <Pin aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label={sidebarOpen ? 'Collapse reader sidebar' : 'Expand reader sidebar'} onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            <PanelLeft aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="Close other tabs" disabled={!currentTab} onClick={closeOtherTabsFromWorkspace} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Others</button>
          <button type="button" aria-label="Close tabs to right" disabled={!currentTab} onClick={closeTabsToRightFromWorkspace} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Right</button>
          <button type="button" aria-label={deepLinkCopied ? 'Deep link copied' : 'Copy deep link'} onClick={() => void copyDeepLink()} className="rounded-lg p-2 text-x-muted hover:bg-x-panel">
            {deepLinkCopied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          </button>
          <button type="button" aria-label="Open source folder" disabled={!currentTab || !onOpenSourceFolder} onClick={() => currentTab && onOpenSourceFolder?.(currentTab.sourceId)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Folder</button>
          <button type="button" aria-label="Open source URL" disabled={!currentTab || !onOpenSourceUrl} onClick={() => currentTab && onOpenSourceUrl?.(currentTab.sourceId)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Source</button>
          <button type="button" aria-label="Open source file" disabled={!currentTab || !onOpenSourceFile} onClick={() => currentTab && onOpenSourceFile?.(currentTab.sourceId, currentTab.path)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">File</button>
          <button type="button" aria-label="Open source file in editor" disabled={!currentTab || !onOpenSourceFileInEditor} onClick={() => currentTab && onOpenSourceFileInEditor?.(currentTab.sourceId, currentTab.path)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Edit</button>
          <button type="button" aria-label="Open source terminal" disabled={!currentTab || !onOpenSourceTerminal} onClick={() => currentTab && onOpenSourceTerminal?.(currentTab.sourceId)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">Term</button>
          <button type="button" aria-label="Zoom out" disabled={zoom <= 80} onClick={() => changeZoom(-10)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">−</button>
          <span aria-label="Reader zoom" className="self-center px-1 text-xs text-x-muted">{zoom}%</span>
          <button type="button" aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} density`} onClick={() => setDensity((current) => current === 'comfortable' ? 'compact' : 'comfortable')} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel">{density === 'comfortable' ? 'Compact' : 'Comfortable'}</button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 140} onClick={() => changeZoom(10)} className="rounded-lg px-2 text-xs text-x-muted hover:bg-x-panel disabled:opacity-40">+</button>
        </div>
      </header>

      {currentTab && visibleDocument ? (
        <div className={sidebarOpen ? 'grid md:grid-cols-[13rem_1fr]' : ''}>
          {sidebarOpen && <aside aria-label="Reader sidebar" className="border-b border-x-line bg-x-paper p-4 md:border-b-0 md:border-r"><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-x-muted">{visibleDocument.navigation?.length ? 'Documentation' : 'Open documents'}</p><nav className="space-y-1">{visibleDocument.navigation?.length ? visibleDocument.navigation.map((item) => renderNavigationItem(item, openNavigationItem)) : tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTabId(tab.id)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${tab.id === currentTab.id ? 'bg-x-mint font-semibold text-x-ink' : 'text-x-muted hover:bg-x-panel'}`}>{tab.title}</button>)}</nav></aside>}
          <div id={`panel-${currentTab.id}`} role="tabpanel" aria-labelledby={`tab-${currentTab.id}`} className="p-6 md:p-10"><DocumentView document={visibleDocument} focusLocation={currentTab.location ?? visibleDocument.focusLocation} focusAnchor={currentTab.anchor} onInternalLink={openInternalLink} onExternalLink={(link) => onOpenExternalUrl?.(link.target)} zoom={zoom} density={density} /></div>
        </div>
      ) : loadedDocument.loading ? (
        <p className="p-10 text-x-muted" role="status">Loading document…</p>
      ) : loadedDocument.error ? (
        <p className="p-10 text-x-coral" role="alert">{loadedDocument.error}</p>
      ) : (
        <p className="p-10 text-x-muted">Open a document to start reading.</p>
      )}
    </section>
  )
}

function renderNavigationItem(item: ReaderNavigationItem, onOpen: (item: ReaderNavigationItem) => void, depth = 0): ReactNode {
  return (
    <div key={item.path} className="space-y-1">
      <button type="button" onClick={() => onOpen(item)} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-x-muted hover:bg-x-panel" style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}>
        {item.label}
      </button>
      {item.children?.map((child) => renderNavigationItem(child, onOpen, depth + 1))}
    </div>
  )
}

function resolveInternalPath(currentPath: string, target: string): string | undefined {
  const cleanTarget = target.split('#', 1)[0].split('?', 1)[0]
  if (!cleanTarget || cleanTarget.startsWith('/') || cleanTarget.includes('\\')) return undefined

  const segments = currentPath.split('/').slice(0, -1)
  for (const segment of cleanTarget.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (!segments.length) return undefined
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/') || undefined
}

function isReaderTab(value: unknown): value is ReaderTab {
  if (!value || typeof value !== 'object') return false
  const tab = value as Partial<ReaderTab>
  return typeof tab.id === 'string'
    && typeof tab.sourceId === 'string'
    && typeof tab.refName === 'string'
    && typeof tab.path === 'string'
    && typeof tab.title === 'string'
    && typeof tab.pinned === 'boolean'
    && Array.isArray(tab.history)
    && tab.history.every((path) => typeof path === 'string')
}
