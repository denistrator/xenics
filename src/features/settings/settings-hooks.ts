import { useCallback, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type Density = 'comfortable' | 'compact'
export type UpdateSchedule = 'on-launch' | 'daily' | 'weekly' | 'disabled'

export interface XenicsSettings {
  theme: Theme
  density: Density
  updateSchedule: UpdateSchedule
  editorCommand: string
  allowLocalFolderUpdates: boolean
  notificationsEnabled: boolean
  libraryPath: string
}

export const defaultSettings = {
  theme: 'system',
  density: 'comfortable',
  updateSchedule: 'on-launch',
  editorCommand: '',
  allowLocalFolderUpdates: false,
  notificationsEnabled: true,
  libraryPath: '',
} satisfies XenicsSettings

export const themeOptions = ['system', 'light', 'dark'] as const
export const updateScheduleOptions = ['on-launch', 'daily', 'weekly', 'disabled'] as const
export const densityOptions = ['comfortable', 'compact'] as const

export function isTheme(value: string): value is Theme {
  return themeOptions.includes(value as Theme)
}

export function isUpdateSchedule(value: string): value is UpdateSchedule {
  return updateScheduleOptions.includes(value as UpdateSchedule)
}

export function useSettings(initial: XenicsSettings = defaultSettings) {
  const [settings, setSettings] = useState<XenicsSettings>(() => ({ ...initial }))

  const updateSettings = useCallback((patch: Partial<XenicsSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  return { settings, updateSettings }
}
