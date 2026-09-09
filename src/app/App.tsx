import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { repositories } from '../features/catalog/catalog-model'
import { useLocationHash } from '../lib/use-location-hash'
import { invokeCommand } from '../lib/tauri'

export function App() {
  const activeHash = useLocationHash()
  const showSettings = activeHash === '#settings'

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

  return (
    <AppShell activeHash={activeHash}>
      {showSettings ? <SettingsPage /> : <CatalogPage onDownload={downloadRepositories} />}
    </AppShell>
  )
}
