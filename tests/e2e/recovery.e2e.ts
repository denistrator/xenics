import { expect } from 'expect-webdriverio'

describe('Xenics recovery surface', () => {
  it('keeps the task panel feature available to the application', async () => {
    await expect($('[role="application"][aria-label="Xenics"]')).toBeDisplayed()
  })
})
