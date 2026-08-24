import { test, expect } from '@playwright/test'

// The acceptance test for putting the thread on the diary detail page.
//
// Written against the fake stream (`?bench=1` is what the client sends), so it asserts the
// streaming UI without spending a model call per run.
test('a saved entry gets a thread beside it that streams a reply', async ({ page }) => {
  const DATE = '2020-01-02'
  const body = `Thread E2E ${Date.now()}`

  await page.goto(`/diary/write?date=${DATE}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: /저장|수정/ }).click()
  await expect(page).toHaveURL(new RegExp(`/diary/${DATE}$`))

  const composer = page.getByLabel('메시지 입력')
  await expect(composer, 'the entry should have a thread beside it').toBeVisible()

  // Unique per run. The entry is updated in place each time, but messages append, so a
  // fixed string matches every previous run's copy too and the assertion below stops
  // being about this run. Cleaning the thread instead needs the deletion work in item 5.
  const message = `오늘 힘들었어 ${Date.now()}`
  await composer.fill(message)

  // The message is painted optimistically the instant it is sent, so seeing it proves
  // nothing about the server having it. Waiting for the response headers does: they are
  // sent after the message is stored and before the reply starts streaming. Without this
  // the reload below can beat the insert — which it began doing as soon as saving stopped
  // waiting on a model call and everything got faster.
  const responded = page.waitForResponse(
    (r) => r.url().includes('/messages') && r.request().method() === 'POST'
  )
  await page.getByRole('button', { name: '보내기' }).click()
  await responded

  // Streaming has started once a stop control replaces the send button.
  await expect(page.getByRole('button', { name: '정지' })).toBeVisible()

  // And the message is persisted, not just painted.
  await expect(page.getByText(message)).toBeVisible()
  await page.reload()
  await expect(page.getByText(message)).toBeVisible()
})
