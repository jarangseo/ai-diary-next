import { test, expect } from '@playwright/test'

// Its own date so it never races the specs that reuse a fixed one.
const DATE = '2020-01-03'

test('an entry can be deleted, and stays deleted', async ({ page }) => {
  const body = `Deletion E2E ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: /저장|수정/ }).click()
  // Saving awaits an OpenAI call (item 6).
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`), { timeout: 20_000 })
  await expect(page.getByText(body)).toBeVisible()

  // Two steps on purpose — a native confirm() would be dismissed by automation, leaving
  // the destructive path untested.
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('group', { name: '이 일기와 대화를 모두 지울까요?' }).waitFor()
  await page
    .getByRole('group', { name: '이 일기와 대화를 모두 지울까요?' })
    .getByRole('button', { name: '삭제' })
    .click()

  await expect(page).toHaveURL(/\/diary$/)

  // Gone from the server, not just from this render.
  const response = await page.request.get(`/api/diary/${DATE}`)
  expect(response.status()).toBe(404)
})

test('cancelling leaves the entry alone', async ({ page }) => {
  const body = `Deletion cancel E2E ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: /저장|수정/ }).click()
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`), { timeout: 20_000 })

  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('button', { name: '취소' }).click()

  await page.reload()
  await expect(page.getByText(body)).toBeVisible()
})
