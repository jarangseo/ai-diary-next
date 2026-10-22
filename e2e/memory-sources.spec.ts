import { test, expect } from '@playwright/test'
import { removeEntries, startChatEntry, writeEntry } from './entries'
import { todayIn } from '../src/lib/entryGroups'

// Source chips (#76): a reply that drew on a past entry shows `M월 D일 일기` under it, and the
// chip opens that entry. Test runs stand in for the citing model with the newest entry
// memory held (lib/memorySources.ts#fakeCited), so this checks the path end to end.

const ZONE = 'Asia/Seoul'
test.use({ timezoneId: ZONE })

const created: string[] = []
test.beforeEach(async ({ page }) => {
  await page.request.patch('/api/settings', { data: { timezone: ZONE, memoryEnabled: true } })
})
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

test('a reply that drew on an entry links to it', async ({ page }) => {
  // The fake reply streams for ~16 s before the chips can be chosen.
  test.setTimeout(90_000)
  const today = todayIn(new Date(), ZONE)
  const past = await writeEntry(page, today, `E2E 기억할 일기 ${Date.now()}`)
  created.push(past)

  created.push(await startChatEntry(page, `E2E 오늘 이야기 ${Date.now()}`))
  const [, month, day] = today.split('-').map(Number)
  const chips = page.getByRole('list', { name: '참고한 일기' })
  const chip = chips.getByRole('link', { name: `${month}월 ${day}일 일기` })
  await expect(chip).toBeVisible({ timeout: 40_000 })
  await expect(chips.getByRole('link')).toHaveCount(1)

  // Stored with the reply, and it opens the entry.
  await page.reload()
  await chip.click()
  await expect(page).toHaveURL(new RegExp(`/diary/${past}$`))
})

test('with memory off, no reply shows chips', async ({ page }) => {
  test.setTimeout(90_000)
  await page.request.patch('/api/settings', { data: { memoryEnabled: false } })
  try {
    created.push(await writeEntry(page, todayIn(new Date(), ZONE), `E2E 끈 기억 ${Date.now()}`))
    created.push(await startChatEntry(page, `E2E 기억 끔 ${Date.now()}`))
    // Wait for the reply to finish: the composer's send comes back when it is done.
    await expect(page.getByRole('button', { name: '보내기' })).toBeVisible({ timeout: 40_000 })
    await expect(page.getByRole('list', { name: '참고한 일기' })).toHaveCount(0)
  } finally {
    await page.request.patch('/api/settings', { data: { memoryEnabled: true } })
  }
})
