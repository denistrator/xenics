import type { ChangeEvent, ReactNode } from 'react'
import type { XenicsSettings } from './settings-hooks'
import {
  densityOptions,
  isTheme,
  isUpdateSchedule,
  themeOptions,
  updateScheduleOptions,
  useSettings,
} from './settings-hooks'

type SettingsPageProps = {
  initialSettings?: XenicsSettings
  onSettingsChange?: (patch: Partial<XenicsSettings>) => void
}

const themeLabels: Record<XenicsSettings['theme'], string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const scheduleLabels: Record<XenicsSettings['updateSchedule'], string> = {
  'on-launch': 'On launch',
  daily: 'Daily',
  weekly: 'Weekly',
  disabled: 'Disabled',
}

export function SettingsPage({ initialSettings, onSettingsChange }: SettingsPageProps): ReactNode {
  const { settings, updateSettings } = useSettings(initialSettings)

  function changeSettings(patch: Partial<XenicsSettings>): void {
    updateSettings(patch)
    onSettingsChange?.(patch)
  }

  function handleThemeChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isTheme(event.target.value)) changeSettings({ theme: event.target.value })
  }

  function handleScheduleChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isUpdateSchedule(event.target.value)) changeSettings({ updateSchedule: event.target.value })
  }

  return (
    <section aria-labelledby="settings-title" className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Preferences</p>
        <h1 id="settings-title" className="mt-2 font-display text-4xl tracking-tight">Settings</h1>
      </header>

      <fieldset className="rounded-2xl border border-x-line bg-x-panel p-5">
        <legend className="text-lg font-semibold">Appearance</legend>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold">Theme</span>
            <select
              value={settings.theme}
              onChange={handleThemeChange}
              className="w-full rounded-lg border border-x-line bg-x-paper px-3 py-2"
            >
              {themeOptions.map((theme) => <option key={theme} value={theme}>{themeLabels[theme]}</option>)}
            </select>
          </label>
          <fieldset className="space-y-2 text-sm">
            <legend className="font-semibold">Density</legend>
            {densityOptions.map((density) => (
              <label key={density} className="flex items-center gap-2 capitalize">
                <input
                  type="radio"
                  name="density"
                  value={density}
                  checked={settings.density === density}
                  onChange={() => changeSettings({ density })}
                />
                {density}
              </label>
            ))}
          </fieldset>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-x-line bg-x-panel p-5">
        <legend className="text-lg font-semibold">Updates and integrations</legend>
        <div className="mt-4 space-y-5 text-sm">
          <label className="block space-y-2">
            <span className="font-semibold">Automatic update checks</span>
            <select
              value={settings.updateSchedule}
              onChange={handleScheduleChange}
              className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 sm:max-w-xs"
            >
              {updateScheduleOptions.map((schedule) => (
                <option key={schedule} value={schedule}>{scheduleLabels[schedule]}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="font-semibold">Editor command</span>
            <input
              value={settings.editorCommand}
              onChange={(event) => changeSettings({ editorCommand: event.target.value })}
              placeholder="Uses the system default when empty"
              className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.allowLocalFolderUpdates}
              onChange={(event) => changeSettings({ allowLocalFolderUpdates: event.target.checked })}
            />
            Allow updates for explicitly referenced local Git folders
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(event) => changeSettings({ notificationsEnabled: event.target.checked })}
            />
            Show native completion and error notifications
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-x-line bg-x-panel p-5">
        <legend className="text-lg font-semibold">Storage</legend>
        <label className="mt-4 block space-y-2 text-sm">
          <span className="font-semibold">Managed library location</span>
          <input
            value={settings.libraryPath}
            readOnly
            placeholder="Default user data location"
            className="block w-full rounded-lg border border-x-line bg-x-paper px-3 py-2 text-x-muted"
          />
        </label>
      </fieldset>
    </section>
  )
}
