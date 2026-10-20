import { test, expect } from '@playwright/test'
import { removeEntries, startChatEntry } from './entries'

// First run (#85, screen 5-1): shown whenever the user has no entries. Every spec removes
// the entries it makes, and the run's user is its own, so the home starts empty here.

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

test('a user with no entries sees first run, and it is gone after the first message', async ({
  page,
}) => {
  await page.goto('/diary')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('반가워요.')
  await expect(page.getByText('처음이라면 대화로 시작해 보세요.', { exact: false })).toBeVisible()
  await expect(
    page.getByText('쓴 글은 답장과 일기 정리를 위해 AI에게 전달돼요.', { exact: false })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '자세히 보기' })).toHaveAttribute('href', '/settings')
  const sidebar = page.getByRole('navigation', { name: '지난 일기' })
  await expect(sidebar.getByText('아직 일기가 없어요.', { exact: false })).toBeVisible()

  created.push(await startChatEntry(page, `E2E 첫 일기 ${Date.now()}`))
  await page.goto('/diary')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E님,오늘은 어땠어요?')
  await expect(page.getByText('처음이라면 대화로 시작해 보세요.', { exact: false })).toHaveCount(0)
  await expect(sidebar.getByText('아직 일기가 없어요.', { exact: false })).toHaveCount(0)

  // Deleting them all brings it back.
  await removeEntries(page, created.splice(0))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('반가워요.')
})
