import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('offers theme choices and remembers density changes', () => {
    const onSettingsChange = vi.fn()
    render(<SettingsPage onSettingsChange={onSettingsChange} />)

    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /compact/i }))

    expect(onSettingsChange).toHaveBeenCalledWith({ density: 'compact' })
    expect(screen.getByRole('radio', { name: /compact/i })).toBeChecked()
  })

  it('keeps local settings usable when the native bridge is unavailable', async () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } })
    expect(screen.getByLabelText('Theme')).toHaveValue('dark')
  })
})
