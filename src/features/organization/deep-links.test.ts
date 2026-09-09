import { describe, expect, it } from 'vitest'
import { parseXenicsUrl } from './organization-hooks'

describe('Xenics deep links', () => {
  it('preserves source, ref, path, and anchor', () => {
    expect(
      parseXenicsUrl(
        'xenics://docs/react?ref=main&path=learn/start.md&anchor=install',
      ),
    ).toEqual({
      sourceId: 'react',
      refName: 'main',
      path: 'learn/start.md',
      anchor: 'install',
    })
  })
})
