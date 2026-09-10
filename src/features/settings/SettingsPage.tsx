import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import type { XenicsSettings } from './settings-hooks'
import {
  densityOptions,
  isTheme,
  isUpdateSchedule,
  themeOptions,
  updateScheduleOptions,
  useSettings,
} from './settings-hooks'
import { hasNativeBridge, invokeCommand } from '../../lib/tauri'

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
  const { settings, updateSettings, replaceSettings } = useSettings(initialSettings)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const [resetPreview, setResetPreview] = useState<{ deletablePaths: string[]; confirmationToken: string } | null>(null)
  const [resetState, setResetState] = useState<'idle' | 'loading' | 'completed'>('idle')
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasNativeBridge()) return
    let active = true
    void invokeCommand<Partial<XenicsSettings>>('get_settings')
      .then((stored) => {
        if (active && stored) replaceSettings(stored)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [replaceSettings])

  function changeSettings(patch: Partial<XenicsSettings>): void {
    updateSettings(patch)
    onSettingsChange?.(patch)
    setPersistenceError(null)
    if (!hasNativeBridge()) return
    void invokeCommand('update_settings', { patch }).catch(() => {
      setPersistenceError('Settings could not be saved. They will remain active for this session.')
    })
  }

  function handleThemeChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isTheme(event.target.value)) changeSettings({ theme: event.target.value })
  }

  function handleScheduleChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isUpdateSchedule(event.target.value)) changeSettings({ updateSchedule: event.target.value })
  }

  function previewReset(): void {
    if (!hasNativeBridge()) {
      setResetError('Full reset is available in the desktop app.')
      return
    }
    setResetState('loading')
    setResetError(null)
    void invokeCommand<{ deletablePaths: string[]; confirmationToken: string }>('preview_reset')
      .then(setResetPreview)
      .catch(() => setResetError('The reset preview could not be prepared.'))
      .finally(() => setResetState('idle'))
  }

  function executeReset(): void {
    if (!resetPreview) return
    setResetState('loading')
    setResetError(null)
    void invokeCommand('execute_reset', { confirmationToken: resetPreview.confirmationToken })
      .then(() => {
        setResetPreview(null)
        setResetState('completed')
      })
      .catch(() => setResetError('The reset could not be completed. No further files were removed.'))
      .finally(() => setResetState((current) => current === 'completed' ? current : 'idle'))
  }

  return (
    <>
      <section aria-labelledby="settings-title" className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-x-mint-strong">Preferences</p>
        <h1 id="settings-title" className="mt-2 font-display text-4xl tracking-tight">Settings</h1>
        {persistenceError && <p role="alert" className="mt-3 text-sm text-x-danger">{persistenceError}</p>}
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

      <fieldset className="rounded-2xl border border-x-danger/40 bg-x-panel p-5">
        <legend className="text-lg font-semibold text-x-danger">Reset Xenics</legend>
        <p className="mt-3 max-w-2xl text-sm text-x-muted">
          Remove Xenics settings, bookmarks, task history, search data, and repositories managed inside its library.
          Explicitly referenced folders outside that library are preserved.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-x-danger px-4 py-2 text-sm font-semibold text-x-danger disabled:cursor-wait disabled:opacity-60"
          onClick={previewReset}
          disabled={resetState === 'loading'}
        >
          {resetState === 'loading' ? 'Preparing reset…' : 'Preview full reset'}
        </button>
        {resetState === 'completed' && <p className="mt-3 text-sm text-x-mint-strong">Xenics has been reset.</p>}
        {resetError && <p role="alert" className="mt-3 text-sm text-x-danger">{resetError}</p>}
      </fieldset>
      </section>
      {resetPreview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-x-ink/30 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" className="w-full max-w-lg rounded-2xl border border-x-danger/40 bg-x-panel p-6 shadow-2xl">
            <h2 id="reset-dialog-title" className="font-display text-2xl tracking-tight">Confirm full reset</h2>
            <p className="mt-3 text-sm text-x-muted">
              This permanently removes Xenics data and the following managed repository folders. External and local-folder sources are preserved.
            </p>
            <div className="mt-4 max-h-40 overflow-auto rounded-lg bg-x-paper p-3 text-xs text-x-muted">
              {resetPreview.deletablePaths.length === 0
                ? 'No managed repository folders will be deleted.'
                : resetPreview.deletablePaths.map((path) => <div key={path} className="truncate">{path}</div>)}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="rounded-lg border border-x-line px-4 py-2 text-sm font-semibold" onClick={() => setResetPreview(null)}>Cancel</button>
              <button type="button" className="rounded-lg bg-x-danger px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" onClick={executeReset} disabled={resetState === 'loading'}>
                {resetState === 'loading' ? 'Resetting…' : 'Delete and reset'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
