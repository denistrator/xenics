import { expect } from 'expect-webdriverio'

describe('Xenics repository lifecycle shell', () => {
  it('shows the bulk download action', async () => {
    await expect($('button*=Download all')).toBeDisplayed()
  })
})
