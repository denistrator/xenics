import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function App() {
  const showSettings = typeof window !== 'undefined' && window.location.hash === '#settings'

  return (
    <AppShell>
      {showSettings ? <SettingsPage /> : <CatalogPage />}
    </AppShell>
  )
}
