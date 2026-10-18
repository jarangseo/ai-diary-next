import { test, expect } from '@playwright/test'
import { removeEntries, startChatEntry } from './entries'

// Screen 1-1, 대화 중 (#82), against the fake stream.

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

test('the home’s first message is sent once, streams a reply and titles the entry', async ({
  page,
}) => {
  // Longer than 30 characters, so the title is visibly cut.
  const message = `퇴근길에 노을이 진짜 예뻤어. 사진 찍으려고 잠깐 멈췄어 ${Date.now()}`
  const title = Array.from(message).slice(0, 30).join('')

  const id = await startChatEntry(page, message)
  created.push(id)

  const log = page.getByRole('log', { name: '대화' })
  await expect(log.getByText(message)).toBeVisible()
  await expect(page.getByRole('button', { name: '정지' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  // Taken, not copied: a reload must never send it again.
  expect(await page.evaluate((key) => sessionStorage.getItem(key), `first-message:${id}`)).toBe(
    null
  )
  // A chat entry gets its emotion at wrap-up; nothing waits for an analysis here.
  await expect(page.getByText('감정을 살펴보는 중이에요…')).toHaveCount(0)

  await page.reload()
  await expect(log.getByText(message)).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  // The sidebar shows the same title, marked as not yet wrapped up.
  const row = page.getByRole('navigation', { name: '지난 일기' }).getByRole('link', {
    name: `정리 전 대화, ${title}`,
  })
  await expect(row).toHaveAttribute('aria-current', 'page')
})

test('the sidebar’s 새 일기 opens the home', async ({ page }) => {
  await page.goto('/diary')
  await expect(page.getByRole('link', { name: '새 일기' })).toHaveAttribute('href', '/diary')
})

test.describe('when something goes wrong (spec 5-2)', () => {
  const MESSAGES = '**/api/threads/*/messages*'

  // A chat entry whose first reply has been stopped, ready for the next message.
  test.beforeEach(async ({ page }) => {
    created.push(await startChatEntry(page, `E2E 실패 상태 ${Date.now()}`))
    await page.getByRole('button', { name: '정지' }).click()
    await expect(page.getByRole('button', { name: '보내기' })).toBeVisible()
  })

  test('a failed reply keeps the message and 다시 시도 sends it again', async ({ page }) => {
    const message = `답장 실패 ${Date.now()}`
    await page.route(MESSAGES, (route) => route.fulfill({ status: 500 }))
    await page.getByLabel('이어서 이야기하기').fill(message)
    await page.getByRole('button', { name: '보내기' }).click()

    const log = page.getByRole('log', { name: '대화' })
    await expect(log.getByText(message)).toBeVisible()
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      /답장을 받지 못했어요\. 쓴 글은 그대로 있어요\./
    )

    await page.unroute(MESSAGES)
    const stored = page.waitForResponse(
      (r) => r.url().includes('/messages') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: '다시 시도' }).click()
    expect((await stored).ok()).toBe(true)
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '정지' })).toBeVisible()

    // Sent once: the failed attempt never reached the server.
    await page.reload()
    await expect(log.getByText(message)).toHaveCount(1)
  })
})
