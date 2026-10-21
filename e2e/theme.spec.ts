import { test, expect, type Page } from '@playwright/test'

// Browser storage only, so this spec touches no database rows.

const PAPER_BG = 'rgb(250, 248, 244)' // bg, light
const NIGHT_BG = 'rgb(21, 23, 27)' // bg, dark

const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('a chosen theme applies at once and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/settings')

  await page.getByRole('radio', { name: '밤' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await pageBackground(page)).toBe(NIGHT_BG)

  // Applied before paint by the inline script, not only after hydration.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await pageBackground(page)).toBe(NIGHT_BG)
  await expect(page.getByRole('radio', { name: '밤' })).toBeChecked()
})

test('"시스템 설정" follows the operating system', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('radio', { name: '낮' }).check()
  await page.getByRole('radio', { name: '시스템 설정' }).check()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)

  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await pageBackground(page)).toBe(NIGHT_BG)
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await pageBackground(page)).toBe(PAPER_BG)
})
