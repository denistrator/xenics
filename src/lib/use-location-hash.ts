import { useSyncExternalStore } from 'react'

function subscribeToHashChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getCurrentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash
}

export function useLocationHash(): string {
  return useSyncExternalStore(subscribeToHashChanges, getCurrentHash, () => '')
}
