import { useCallback, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type Density = 'comfortable' | 'compact'
export type UpdateSchedule = 'on-launch' | 'daily' | 'weekly' | 'disabled'

export type XenicsSettings = {
  theme: Theme
  density: Density
  updateSchedule: UpdateSchedule
  editorCommand: string
  allowLocalFolderUpdates: boolean
  notificationsEnabled: boolean
  libraryPath: string
}

export const defaultSettings: XenicsSettings = {
  theme: 'system',
  density: 'comfortable',
  updateSchedule: 'on-launch',
  editorCommand: '',
  allowLocalFolderUpdates: false,
  notificationsEnabled: true,
  libraryPath: '',
}

export function useSettings(initial: XenicsSettings = defaultSettings) {
  const [settings, setSettings] = useState(initial)

  const updateSettings = useCallback((patch: Partial<XenicsSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  return { settings, updateSettings }
}
