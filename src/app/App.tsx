import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function App() {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const showSettings = hash === '#settings'

  return (
    <AppShell>
      {showSettings ? <SettingsPage /> : <CatalogPage />}
    </AppShell>
  )
}
