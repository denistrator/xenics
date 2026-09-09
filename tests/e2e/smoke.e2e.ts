import { expect } from 'expect-webdriverio'
import { isolatedUserScope } from './fixtures'

describe('Xenics desktop shell', () => {
  it('launches the real Tauri window', async () => {
    await expect($('[role="application"][aria-label="Xenics"]')).toBeDisplayed()
    expect(isolatedUserScope).toBe('xenics-e2e-scope')
  })
})
