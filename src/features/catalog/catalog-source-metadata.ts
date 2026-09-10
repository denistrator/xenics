import type { Repository, RepositorySourceType } from './catalog-model'

export type NativeSourceMetadata = {
  id: string
  selectedRef?: string
  localPath?: string
  remoteUrl?: string
}

export function applyNativeSourceMetadata(repository: Repository, source: NativeSourceMetadata): Repository {
  const sourceType: RepositorySourceType = source.localPath && !source.remoteUrl ? 'Local folder' : repository.capability === 'Website only' ? 'Website' : 'Git source'
  return {
    ...repository,
    ...(source.selectedRef === undefined ? {} : { selectedRef: source.selectedRef }),
    ...(source.localPath === undefined ? {} : { localPath: source.localPath }),
    sourceType,
  }
}
