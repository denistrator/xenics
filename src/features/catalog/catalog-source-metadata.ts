import type { Repository, RepositorySourceType } from './catalog-model'

export type NativeSourceMetadata = {
  id: string
  selectedRef?: string
  localPath?: string
  remoteUrl?: string
  updatedAt?: string
  diskUsageBytes?: number
  availability?: 'available' | 'up-to-date' | 'unknown'
}

export function resolveCatalogStatus(
  fixtureStatus: Repository['status'],
  repositoryId: string,
  installedIds: ReadonlySet<string>,
  nativeSourcesHydrated: boolean,
): Repository['status'] {
  if (installedIds.has(repositoryId)) return 'Ready'
  if (!nativeSourcesHydrated) return fixtureStatus
  return 'Not installed'
}

const nativeCapabilities = new Set<Repository['capability']>([
  'Readable',
  'Partially readable',
  'Files only',
  'Website only',
])

export function nativeSourceToRepository(source: NativeSourceMetadata & { displayName?: string; capability?: string }): Repository {
  const capability = nativeCapabilities.has(source.capability as Repository['capability'])
    ? source.capability as Repository['capability']
    : 'Files only'
  return {
    id: source.id,
    name: source.displayName?.trim() || source.id,
    vendor: 'Custom source',
    description: source.localPath ? 'A user-owned local documentation folder.' : 'A user-added Git repository.',
    category: 'Custom',
    accent: 'violet',
    status: 'Ready',
    capability,
    sourceUrl: source.remoteUrl ?? '',
    selectedRef: source.selectedRef ?? '',
  }
}

export function applyNativeSourceMetadata(repository: Repository, source: NativeSourceMetadata): Repository {
  const sourceType: RepositorySourceType = source.localPath && !source.remoteUrl ? 'Local folder' : repository.capability === 'Website only' ? 'Website' : 'Git source'
  return {
    ...repository,
    ...(source.selectedRef === undefined ? {} : { selectedRef: source.selectedRef }),
    ...(source.localPath === undefined ? {} : { localPath: source.localPath }),
    ...(source.updatedAt === undefined ? {} : { lastSyncedAt: source.updatedAt }),
    ...(source.diskUsageBytes === undefined ? {} : { diskUsageBytes: source.diskUsageBytes }),
    ...(source.availability === undefined || source.availability === 'unknown'
      ? {}
      : { updateAvailable: source.availability === 'available' }),
    sourceType,
  }
}
