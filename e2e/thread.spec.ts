import { test, expect } from '@playwright/test'

// The oracle for "put the thread on the diary detail page". It fails today because
// nothing renders ThreadPanel outside of tests — that is the point.
// Remove `fixme` as part of that task; if it passes, the task is done.
//
// Written against the fake stream (`?bench=1` is what the client uses in development),
// so it asserts the streaming UI without spending a model call per run.
test.fixme('a saved entry gets a thread beside it that streams a reply', async ({ page }) => {
  const DATE = '2020-01-02'
  const body = `Thread E2E ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: /저장|수정/ }).click()
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`))

  const composer = page.getByLabel('메시지 입력')
  await expect(composer, 'the entry should have a thread beside it').toBeVisible()

  await composer.fill('오늘 힘들었어')
  await page.getByRole('button', { name: '보내기' }).click()

  // Streaming has started once a stop control replaces the send button.
  await expect(page.getByRole('button', { name: '정지' })).toBeVisible()

  // And the reply is persisted, not just painted.
  await expect(page.getByText('오늘 힘들었어')).toBeVisible()
  await page.reload()
  await expect(page.getByText('오늘 힘들었어')).toBeVisible()
})
