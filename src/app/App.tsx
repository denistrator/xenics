import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { repositories } from '../features/catalog/catalog-model'
import { useLocationHash } from '../lib/use-location-hash'
import { invokeCommand } from '../lib/tauri'
import { TaskPanel } from '../features/tasks/TaskPanel'
import { useTaskFeed } from '../features/tasks/use-task-feed'

export function App() {
  const activeHash = useLocationHash()
  const showSettings = activeHash === '#settings'
  const { tasks, cancelTask, retryTask } = useTaskFeed()

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
    await invokeCommand('update_source', { sourceId: repositoryId })
  }

  async function removeRepository(repositoryId: string): Promise<void> {
    await invokeCommand('remove_source', { sourceId: repositoryId, deleteManagedFiles: true })
  }

  return (
    <AppShell activeHash={activeHash} notifications={tasks}>
      {showSettings ? <SettingsPage /> : <CatalogPage onDownload={downloadRepositories} onUpdate={updateRepository} onRemove={removeRepository} />}
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
