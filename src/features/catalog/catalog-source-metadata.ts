import type { Repository, RepositorySourceType } from './catalog-model'

export type NativeSourceMetadata = {
  id: string
  selectedRef?: string
  localPath?: string
  remoteUrl?: string
  updatedAt?: string
  diskUsageBytes?: number
}

export function applyNativeSourceMetadata(repository: Repository, source: NativeSourceMetadata): Repository {
  const sourceType: RepositorySourceType = source.localPath && !source.remoteUrl ? 'Local folder' : repository.capability === 'Website only' ? 'Website' : 'Git source'
  return {
    ...repository,
    ...(source.selectedRef === undefined ? {} : { selectedRef: source.selectedRef }),
    ...(source.localPath === undefined ? {} : { localPath: source.localPath }),
    ...(source.updatedAt === undefined ? {} : { lastSyncedAt: source.updatedAt }),
    ...(source.diskUsageBytes === undefined ? {} : { diskUsageBytes: source.diskUsageBytes }),
    sourceType,
  }
}
