import { test, expect } from '@playwright/test'

// Runs last by filename, which matters: it removes every row belonging to the shared E2E
// user. The other specs create what they need, so the order is safe rather than merely
// convenient — but it is the reason this file is not called something earlier.
const DATE = '2020-01-04'

test('withdrawing removes the account’s entries', async ({ page }) => {
  const body = `Withdrawal E2E ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: /저장|수정/ }).click()
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`))

  // Confirm it is really there before claiming withdrawal removed it.
  expect((await page.request.get(`/api/diary/${DATE}`)).status()).toBe(200)

  await page.goto('/settings')
  await page.getByRole('button', { name: '탈퇴하기' }).click()
  await page
    .getByRole('group', { name: '일기와 대화를 모두 지우고 탈퇴할까요?' })
    .getByRole('button', { name: '탈퇴' })
    .click()

  // Signed out, so this ends up back at an unauthenticated entry point. Asserting the
  // exact destination would be asserting NextAuth's redirect config, not this feature.
  await expect(page).not.toHaveURL(/\/settings$/)

  // The data is gone even to an authenticated request — the session cookie was cleared in
  // the browser, so this asks the server directly with the stored state.
  const after = await page.request.get(`/api/diary/${DATE}`)
  expect(after.status()).not.toBe(200)
})
