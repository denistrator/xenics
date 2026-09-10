import { expect } from 'expect-webdriverio'

describe('Xenics search and reader shell', () => {
  it('launches with documentation library copy', async () => {
    await expect($('body')).toHaveText(expect.stringContaining('Documentation library'))
  })

  it('opens the full search view with query and exact-match controls', async () => {
    const links = await $$('a[href="#search"]')
    for (const link of links) {
      if (await link.isDisplayed()) {
        await link.click()
        break
      }
    }

    await expect($('h1=Find the exact page.')).toBeDisplayed()
    await expect($('input')).toBeDisplayed()
  })
})
