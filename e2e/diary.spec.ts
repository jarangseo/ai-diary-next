import { test, expect } from '@playwright/test'

// A fixed date far outside any real usage, reused every run: `saveDiary` updates an
// existing entry rather than inserting, so this never accumulates rows and needs no
// teardown. The button reads 저장 the first time and 수정 afterwards.
const DATE = '2020-01-01'

test('writing an entry saves it and shows it on the detail page', async ({ page }) => {
  const body = `E2E entry ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)

  const editor = page.getByPlaceholder('오늘 하루는 어땠나요?')
  await expect(editor).toBeVisible()
  await editor.fill(body)

  await page.getByRole('button', { name: /저장|수정/ }).click()

  // Saving replaces the write page in history, so the detail page is where it lands.
  //
  // The generous timeout is not flakiness padding: POST /api/diary awaits the OpenAI
  // emotion analysis before it responds, so the user waits on a model call every time
  // they save. Worth fixing — the analysis is best-effort and could happen after the
  // response — and this assertion will get faster when it is.
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`), { timeout: 20_000 })
  await expect(page.getByText(body)).toBeVisible()
})

test('the detail page offers an edit route back to the entry', async ({ page }) => {
  await page.goto(`/diary/${DATE}`)
  await expect(page.getByRole('link', { name: '수정' })).toHaveAttribute(
    'href',
    `/diary/write?date=${DATE}`
  )
})
