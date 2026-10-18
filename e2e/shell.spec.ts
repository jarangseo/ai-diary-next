import { test, expect } from '@playwright/test'
import { removeEntries, writeEntry } from './entries'
import { todayIn } from '../src/lib/entryGroups'

// The sidebar groups by the user's stored zone, not the browser's or the server's. Pin
// both to one zone that is neither the server's usual one nor UTC, so "today" is
// unambiguous and the test does not depend on what an earlier spec left in settings.
const ZONE = 'America/New_York'
test.use({ timezoneId: ZONE })

test.beforeEach(async ({ page }) => {
  const res = await page.request.patch('/api/settings', { data: { timezone: ZONE } })
  expect(res.ok()).toBe(true)
})

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

test('the sidebar lists a just-written entry under 오늘 and opens it', async ({ page }) => {
  const id = await writeEntry(page, todayIn(new Date(), ZONE), `E2E sidebar ${Date.now()}`)
  created.push(id)

  await page.goto('/diary')
  const nav = page.getByRole('navigation', { name: '지난 일기' })
  const today = nav.getByRole('region', { name: '오늘' })
  // By href, not by title: the AI may already have replaced the fallback title.
  const link = today.locator(`a[href="/diary/${id}"]`)
  await expect(link).toBeVisible()
  await expect(link).not.toHaveAttribute('aria-current', 'page')

  await link.click()
  await expect(page).toHaveURL(new RegExp(`/diary/${id}$`))
  await expect(link).toHaveAttribute('aria-current', 'page')
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the drawer opens, keeps focus inside and closes on Escape', async ({ page }) => {
    await page.goto('/diary')
    const sidebar = page.locator('#app-sidebar')
    await expect(sidebar).toBeHidden()

    const opener = page.getByRole('button', { name: '지난 일기 열기' })
    await opener.click()
    const drawer = page.getByRole('dialog', { name: '지난 일기' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: '지난 일기 닫기' })).toBeFocused()

    // Tab past the last control comes back to the first, never to the page behind.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(sidebar).toBeHidden()
    await expect(opener).toBeFocused()
  })
})
