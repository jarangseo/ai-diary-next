import { test, expect } from '@playwright/test'

// Screen 5-3 (#86): `지난 일기 참고하기` is stored per user and survives a reload.

test.afterEach(async ({ page }) => {
  // Back to the default, so later specs meet the AI with memory on.
  await page.request.patch('/api/settings', { data: { memoryEnabled: true } })
})

test('turning memory off persists across a reload', async ({ page }) => {
  await page.request.patch('/api/settings', { data: { memoryEnabled: true } })
  await page.goto('/settings')

  const memory = page.getByRole('switch', { name: '지난 일기 참고하기' })
  await expect(memory).toHaveAttribute('aria-checked', 'true')
  await expect(memory).toHaveAccessibleDescription(/최근 2주 동안의 일기/)

  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/settings') && r.request().method() === 'PATCH'
  )
  await memory.click()
  expect((await saved).ok()).toBe(true)
  await expect(memory).toHaveAttribute('aria-checked', 'false')
  await expect(memory).toBeFocused()

  await page.reload()
  await expect(memory).toHaveAttribute('aria-checked', 'false')
  const stored = await (await page.request.get('/api/settings')).json()
  expect(stored.settings.memoryEnabled).toBe(false)
})

test('a failed save puts the switch back and says so', async ({ page }) => {
  await page.goto('/settings')
  const memory = page.getByRole('switch', { name: '지난 일기 참고하기' })
  await expect(memory).toHaveAttribute('aria-checked', 'true')

  await page.route('**/api/settings', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 500, json: { error: 'Failed to save' } })
      : route.continue()
  )
  await memory.click()
  // By text: Next.js keeps its own route announcer in the page as another alert.
  await expect(
    page.getByRole('alert').filter({ hasText: '저장하지 못했어요. 잠시 뒤 다시 바꿔 주세요.' })
  ).toBeVisible()
  await expect(memory).toHaveAttribute('aria-checked', 'true')
})
