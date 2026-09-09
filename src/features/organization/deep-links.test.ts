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

  it.each([
    'xenics://docs/react?ref=main&path=../secrets.md',
    'xenics://docs/react?ref=main&path=%2Fetc%2Fpasswd',
    'xenics://docs/react?ref=main&path=docs%5C..%5Csecrets.md',
  ])('rejects unsafe paths: %s', (url) => {
    expect(() => parseXenicsUrl(url)).toThrow(/invalid xenics deep link target/i)
  })
})
