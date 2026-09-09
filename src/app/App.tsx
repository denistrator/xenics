import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'

export function App() {
  return (
    <AppShell>
      <CatalogPage />
    </AppShell>
  )
}
