import { expect } from 'expect-webdriverio'

describe('Xenics repository lifecycle shell', () => {
  it('shows the bulk download action', async () => {
    const catalogLinks = await $$('a[href="#catalog"]')
    for (const link of catalogLinks) {
      if (await link.isDisplayed()) {
        await link.click()
        break
      }
    }

    await expect($('button*=Download all')).toBeDisplayed()
  })
})
