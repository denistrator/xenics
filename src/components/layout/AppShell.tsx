import { Bell, BookOpen, Command, FolderGit2, LoaderCircle, Search, Settings2, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { SearchPalette } from '../../features/search/SearchPalette'
import { useNativeSearch } from '../../features/search/search-hooks'
import type { SearchResultModel } from '../../features/search/search-state'
import type { SearchReaderTarget } from '../../features/search/search-state'
import { SearchPage } from '../../features/search/SearchPage'
import { repositories } from '../../features/catalog/catalog-model'
import type { TaskSnapshot } from '../../features/tasks/task-model'
import type { TaskId } from '../../lib/contracts'

type NavigationItem = {
  label: string
  href: string
  icon: LucideIcon
}

const navigationItems = [
  { label: 'Library', href: '#catalog', icon: BookOpen },
  { label: 'Search', href: '#search', icon: Search },
  { label: 'Sources', href: '#sources', icon: FolderGit2 },
  { label: 'Organize', href: '#organize', icon: FolderGit2 },
  { label: 'Settings', href: '#settings', icon: Settings2 },
] satisfies readonly NavigationItem[]

type NavigationLinksProps = {
  activeHash: string
  compact?: boolean
}

function NavigationLinks({ activeHash, compact = false }: NavigationLinksProps): ReactNode {
  return navigationItems.map(({ label, href, icon: Icon }) => {
    const isActive = activeHash === href

    return (
      <a
        key={href}
        aria-current={isActive ? 'page' : undefined}
        className={compact
          ? `rounded-lg px-3 py-2 text-xs font-semibold ${isActive ? 'bg-x-mint text-x-ink' : 'text-x-muted hover:bg-x-paper'}`
          : `flex items-center gap-3 rounded-xl px-3 py-3 ${isActive ? 'bg-x-mint font-semibold' : 'text-x-muted hover:bg-x-paper'}`}
        href={href}
      >
        <Icon aria-hidden="true" size={compact ? 15 : 17} />
        {label}
      </a>
    )
  })
}

type AppShellProps = {
  children: ReactNode
  activeHash?: string
  onSearchSelect?: (result: SearchResultModel) => void
  onSearchTarget?: (target: SearchReaderTarget) => void
  notifications?: TaskSnapshot[]
  onCancelTask?: (taskId: TaskId) => void
  onRetryTask?: (taskId: TaskId) => void
}

export function AppShell({ children, activeHash = '#catalog', onSearchSelect, onSearchTarget, notifications = [], onCancelTask, onRetryTask }: AppShellProps): ReactNode {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { query, setQuery, response, isSearching } = useNativeSearch()

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <main
      role="application"
      aria-label="Xenics"
      className="min-h-screen bg-x-paper text-x-ink lg:grid lg:grid-cols-[248px_1fr]"
    >
      <aside className="hidden border-r border-x-line bg-x-panel px-5 py-6 lg:flex lg:flex-col">
        <div className="mb-12 flex items-center gap-3">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-x-mint text-sm font-bold">X</span>
          <span className="font-display text-xl tracking-tight">Xenics</span>
        </div>

        <nav aria-label="Primary" className="space-y-2 text-sm">
          <NavigationLinks activeHash={activeHash} />
        </nav>

        <div className="mt-auto rounded-2xl border border-x-line bg-x-paper p-4 text-xs text-x-muted">
          <div className="mb-2 flex items-center gap-2 font-semibold text-x-ink">
            <Command size={14} />
            Quick search
          </div>
          <p>Press ⌘ K to find a document across your library.</p>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex items-center justify-between border-b border-x-line bg-x-panel/90 px-5 py-4 backdrop-blur md:px-10">
          <div className="font-display text-xl lg:hidden">Xenics</div>
          <nav aria-label="Mobile primary" className="flex items-center gap-1 lg:hidden">
            <NavigationLinks activeHash={activeHash} compact />
          </nav>
          <div className="hidden text-xs font-semibold uppercase tracking-[.18em] text-x-muted md:block">
            Documentation library
          </div>
          <button
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-xl border border-x-line text-x-muted hover:bg-x-paper"
          >
            <Bell aria-hidden="true" size={18} />
          </button>
          {notificationsOpen && (
            <section aria-label="Notifications" className="absolute right-5 top-20 z-20 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-x-line bg-x-panel p-4 shadow-xl md:right-10">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Notifications</h2>
                <span className="text-xs text-x-muted">{notifications.length}</span>
              </div>
              {notifications.length === 0 ? (
                <p className="mt-4 text-sm text-x-muted">No recent activity.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {notifications.slice(0, 8).map((task) => (
                    <li key={task.taskId} className="rounded-xl bg-x-paper p-3 text-sm">
                      <div className="flex items-center gap-2">
                        {!['Succeeded', 'Failed', 'Canceled', 'Interrupted'].includes(task.state) && <LoaderCircle aria-label="In progress" className="animate-spin text-x-mint-strong" size={14} />}
                        <p className="font-medium">{task.phase}</p>
                      </div>
                      <p className="mt-1 text-xs text-x-muted">{task.state.replace(/([a-z])([A-Z])/g, '$1 $2')}</p>
                      {onCancelTask && !['Succeeded', 'Failed', 'Canceled', 'Interrupted'].includes(task.state) && <button type="button" onClick={() => onCancelTask(task.taskId)} className="mt-2 text-xs font-semibold text-x-danger">Cancel</button>}
                      {onRetryTask && ['Failed', 'Interrupted', 'NeedsAction'].includes(task.state) && <button type="button" onClick={() => onRetryTask(task.taskId)} className="mt-2 text-xs font-semibold text-x-mint-strong">Retry</button>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-12">{activeHash === '#search' ? <SearchPage response={response} query={query} onQueryChange={setQuery} categoryBySource={Object.fromEntries(repositories.map((repository) => [repository.id, repository.category]))} onOpen={(target) => onSearchTarget?.(target)} /> : children}</div>
      </section>
      <SearchPalette
        open={searchOpen}
        query={query}
        results={response.results}
        isSearching={isSearching}
        error={response.error}
        onQueryChange={setQuery}
        onSelect={(result) => {
          setSearchOpen(false)
          onSearchSelect?.(result)
        }}
        onClose={() => setSearchOpen(false)}
      />
    </main>
  )
}
