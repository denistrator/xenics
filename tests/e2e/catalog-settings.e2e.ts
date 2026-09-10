import { expect } from 'expect-webdriverio'

async function clickVisibleNavigationLink(href: string) {
  const links = await $$(`a[href="${href}"]`)
  for (const link of links) {
    if (await link.isDisplayed()) {
      await link.click()
      return
    }
  }

  throw new Error(`No visible navigation link found for ${href}`)
}

describe('Xenics catalog and settings', () => {
  it('navigates to settings and selects a scheduled update mode', async () => {
    await expect($('[role="application"][aria-label="Xenics"]')).toBeDisplayed()
    await clickVisibleNavigationLink('#settings')
    await expect($('h1=Settings')).toBeDisplayed()

    const schedule = $('select[aria-label="Automatic update checks"]')
    await browser.execute(() => {
      const dropdown = document.querySelector('select[aria-label="Automatic update checks"]') as HTMLSelectElement | null
      if (!dropdown) throw new Error('Automatic update select is missing')
      dropdown.value = 'weekly'
      dropdown.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(schedule).toHaveValue('weekly')
  })

  it('filters the catalog and opens repository details', async () => {
    await expect($('[role="application"][aria-label="Xenics"]')).toBeDisplayed()
    await clickVisibleNavigationLink('#catalog')
    await expect($('h1*=The tools you build with')).toBeDisplayed()

    await $('button[aria-label="Filter repositories"]').click()
    await $('select[aria-label="Filter by category"]').selectByVisibleText('Data')
    await expect($('h2=SQLite')).toBeDisplayed()

    await $('button[aria-label="SQLite details"]').click()
    await expect($('[role="dialog"][aria-label="SQLite details"]')).toBeDisplayed()
  })
})
