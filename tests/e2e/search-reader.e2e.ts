import { expect } from 'expect-webdriverio'

describe('Xenics search and reader shell', () => {
  it('launches with documentation library copy', async () => {
    await expect($('body')).toHaveText(expect.stringContaining('Documentation library'))
  })
})
