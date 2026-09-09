import { expect } from 'expect-webdriverio'

describe('Xenics first launch', () => {
  it('shows the catalog shell and primary navigation', async () => {
    await expect($('[role="application"][aria-label="Xenics"]')).toBeDisplayed()
    await expect($('a[href="#catalog"]')).toExist()
    await expect($('a[href="#settings"]')).toExist()
  })
})
