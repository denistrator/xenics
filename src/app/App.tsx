import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { useLocationHash } from '../lib/use-location-hash'

export function App() {
  const activeHash = useLocationHash()
  const showSettings = activeHash === '#settings'

  return (
    <AppShell activeHash={activeHash}>
      {showSettings ? <SettingsPage /> : <CatalogPage />}
    </AppShell>
  )
}
