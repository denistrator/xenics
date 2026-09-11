import { AppShell } from '../components/layout/AppShell'
import { useEffect, useState } from 'react'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { repositories } from '../features/catalog/catalog-model'
import type { Repository } from '../features/catalog/catalog-model'
import { useLocationHash } from '../lib/use-location-hash'
import { hasNativeBridge, invokeCommand } from '../lib/tauri'
import { TaskPanel } from '../features/tasks/TaskPanel'
import { useTaskFeed } from '../features/tasks/use-task-feed'
import { ReaderWorkspace } from '../features/reader/ReaderWorkspace'
import { openSearchResult, type SearchReaderTarget } from '../features/search/search-state'
import { OrganizationPage } from '../features/organization/OrganizationPage'
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { parseXenicsUrl } from '../features/organization/organization-hooks'

type ReaderStartPage = {
  sourceId: string
  refName: string
  path: string
  title: string
}

export function App() {
  const activeHash = useLocationHash()
  const showSettings = activeHash === '#settings'
  const showOrganization = activeHash === '#organize'
  const { tasks, cancelTask, retryTask } = useTaskFeed()
  const [readerTarget, setReaderTarget] = useState<SearchReaderTarget | null>(null)

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    const openUrl = (url: string) => {
      try {
        const target = parseXenicsUrl(url)
        if (active) setReaderTarget({ ...target, title: target.path, matchIndex: 0, location: { line: 1, column: 1 } })
      } catch {
        // Invalid external links are ignored after validation at the app boundary.
      }
    }

    void getCurrent().then((urls) => urls?.forEach(openUrl)).catch(() => undefined)
    let unsubscribe: (() => void) | undefined
    void onOpenUrl((urls) => urls.forEach(openUrl))
      .then((unlisten) => { unsubscribe = unlisten })
      .catch(() => undefined)

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  async function downloadRepositories(repositoryIds: string[]): Promise<void> {
    const selectedRepositories = repositories.filter(({ id }) => repositoryIds.includes(id))
    await Promise.all(selectedRepositories.map(async (repository) => {
      await invokeCommand<string>('start_download_source', {
        id: repository.id,
        displayName: repository.name,
        vendor: repository.vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        package: repository.id,
        source: repository.sourceUrl,
        selectedRef: repository.selectedRef,
        shallow: true,
        capability: repository.capability,
      })
    }))
  }

  async function updateRepository(repositoryId: string): Promise<void> {
    await invokeCommand('start_update_source', { sourceId: repositoryId })
  }

  async function removeRepository(repositoryId: string): Promise<void> {
    await invokeCommand('remove_source', { sourceId: repositoryId, deleteManagedFiles: true })
  }

  async function addLocalSource(input: { id: string; displayName: string; path: string }): Promise<Repository> {
    const source = await invokeCommand<{ id: string; displayName: string; capability: string }>('add_local_source', input)
    return {
      id: source.id,
      name: source.displayName,
      vendor: 'Local source',
      description: 'A user-owned local documentation folder.',
      category: 'Custom',
      accent: 'violet',
      status: 'Ready',
      capability: 'Files only',
      sourceUrl: '',
      selectedRef: '',
    }
  }

  async function addRemoteSource(input: { id: string; displayName: string; source: string; selectedRef: string }): Promise<Repository> {
    await invokeCommand('start_download_source', { ...input, vendor: 'custom', package: input.id, shallow: true, capability: 'FilesOnly' })
    return { id: input.id, name: input.displayName, vendor: 'Custom source', description: 'A user-added Git repository.', category: 'Custom', accent: 'violet', status: 'Ready', capability: 'Files only', sourceUrl: input.source, selectedRef: input.selectedRef }
  }

  async function openSourceFolder(repositoryId: string): Promise<void> {
    await invokeCommand('open_source_folder', { sourceId: repositoryId })
  }

  async function openSourceWebsite(repository: Repository): Promise<void> {
    await invokeCommand('open_external_url', { url: repository.sourceUrl })
  }

  function openReaderSourceWebsite(sourceId: string): void {
    const repository = repositories.find(({ id }) => id === sourceId)
    if (repository) void openSourceWebsite(repository)
  }

  function openExternalUrl(url: string): void {
    void invokeCommand('open_external_url', { url })
  }

  function openSourceFile(sourceId: string, path: string): void {
    void invokeCommand('open_source_file', { sourceId, path })
  }

  function openSourceFileInEditor(sourceId: string, path: string): void {
    void invokeCommand('open_source_file_in_editor', { sourceId, path })
  }

  function openSourceTerminal(sourceId: string): void {
    void invokeCommand('open_source_terminal', { sourceId })
  }

  async function openCatalogReader(repository: Repository): Promise<void> {
    const startPage = await invokeCommand<ReaderStartPage>('get_source_start_page', { sourceId: repository.id })
    setReaderTarget({
      ...startPage,
      matchIndex: 0,
      location: { line: 1, column: 1 },
    })
  }

  return (
    <AppShell
      activeHash={activeHash}
      notifications={tasks}
      onCancelTask={(taskId) => { void cancelTask(taskId) }}
      onRetryTask={(taskId) => { void retryTask(taskId) }}
      onSearchSelect={(result) => setReaderTarget(openSearchResult(result))}
      onSearchTarget={setReaderTarget}
    >
      {readerTarget ? (
        <ReaderWorkspace
          initialTabs={[{
            ...readerTarget,
            id: `${readerTarget.sourceId}:${readerTarget.path}`,
            pinned: false,
            history: [readerTarget.path],
          }]}
          onOpenExternalUrl={openExternalUrl}
          onOpenSourceFile={openSourceFile}
          onOpenSourceFileInEditor={openSourceFileInEditor}
          onOpenSourceTerminal={openSourceTerminal}
          onOpenSourceFolder={openSourceFolder}
          onOpenSourceUrl={openReaderSourceWebsite}
        />
      ) : showSettings ? (
        <SettingsPage />
      ) : showOrganization ? (
        <OrganizationPage
          onOpenBookmark={(bookmark) => setReaderTarget({
            ...bookmark,
            matchIndex: 0,
            location: { line: 1, column: 1 },
          })}
        />
      ) : (
        <CatalogPage
          onDownload={downloadRepositories}
          onUpdate={updateRepository}
          onRemove={removeRepository}
          onAddLocalSource={addLocalSource}
          onAddRemoteSource={addRemoteSource}
          onOpenFolder={openSourceFolder}
          onOpenWebsite={openSourceWebsite}
          onOpenReader={openCatalogReader}
        />
      )}
      {tasks.length > 0 && (
        <div className="mx-auto max-w-[1500px] px-5 pb-8 md:px-10">
          <TaskPanel
            tasks={tasks}
            onCancel={(taskId) => { void cancelTask(taskId) }}
            onRetry={(taskId) => { void retryTask(taskId) }}
          />
        </div>
      )}
    </AppShell>
  )
}
