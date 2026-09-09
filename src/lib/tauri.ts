import { invoke } from '@tauri-apps/api/core'

export function invokeCommand<TResult>(command: string, args?: Record<string, unknown>): Promise<TResult> {
  return invoke<TResult>(command, args)
}

export function hasNativeBridge(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
