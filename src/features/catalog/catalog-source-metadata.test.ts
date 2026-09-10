import { describe, expect, it } from 'vitest'
import { applyNativeSourceMetadata, nativeSourceToRepository } from './catalog-source-metadata'

describe('applyNativeSourceMetadata', () => {
  it('maps native source details without changing editable catalog identity', () => {
    const repository = { id: 'react', name: 'React', vendor: 'Meta', description: 'Docs', category: 'Frontend', accent: 'mint' as const, status: 'Not installed' as const, capability: 'Readable' as const, sourceUrl: 'https://github.com/facebook/react.git', selectedRef: 'main' }
    expect(applyNativeSourceMetadata(repository, { id: 'react', selectedRef: 'v19', localPath: '/Users/denis/library/react', remoteUrl: repository.sourceUrl })).toMatchObject({ id: 'react', name: 'React', selectedRef: 'v19', localPath: '/Users/denis/library/react', sourceType: 'Git source' })
  })

  it('restores custom native sources as manageable catalog cards', () => {
    expect(nativeSourceToRepository({
      id: 'custom-team-docs',
      displayName: 'Team docs',
      capability: 'FilesOnly',
      localPath: '/tmp/team-docs',
    })).toMatchObject({
      id: 'custom-team-docs',
      name: 'Team docs',
      category: 'Custom',
      status: 'Ready',
      capability: 'Files only',
    })
  })
})
