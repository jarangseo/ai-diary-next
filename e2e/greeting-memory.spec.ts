import { test, expect } from '@playwright/test'
import { removeEntries, writeEntry } from './entries'
import { todayIn } from '../src/lib/entryGroups'

// The home greeting's memory line (#76): the newest titled entry of the last two weeks, in
// a fixed sentence. A written entry is titled by its first line, as in the sidebar.

const ZONE = 'Asia/Seoul'
test.use({ timezoneId: ZONE })

const created: string[] = []
test.beforeEach(async ({ page }) => {
  await page.request.patch('/api/settings', { data: { timezone: ZONE, memoryEnabled: true } })
})
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
  await page.request.patch('/api/settings', { data: { memoryEnabled: true } })
})

test('the greeting remembers yesterday’s entry, and not with memory off', async ({ page }) => {
  const title = `E2E 어제 ${Date.now() % 100000}`
  // The day before today in the zone, as a calendar date.
  const yesterday = new Date(Date.parse(`${todayIn(new Date(), ZONE)}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10)
  created.push(await writeEntry(page, yesterday, title))

  await page.goto('/diary')
  await expect(page.getByText(`어제 ‘${title}’ 이야기를 남겼어요.`)).toBeVisible()

  await page.request.patch('/api/settings', { data: { memoryEnabled: false } })
  await page.reload()
  await expect(page.getByText('이야기를 남겼어요.')).toHaveCount(0)
})
