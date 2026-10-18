import { test, expect, type Page } from '@playwright/test'
import { removeEntries, startChatEntry } from './entries'

// Wrap-up on the 대화 중 screen (#82, carried from #74), against the fake stream and the
// deterministic draft the wrap-up API makes in test runs.

const OFFER = '오늘 이야기가 꽤 모였어요. 여기까지 일기로 정리해 둘까요?'

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

// The fake reply opens with "오늘 하루를 읽어보니", so counting that counts replies. Each is
// stopped once it has text: the server stores a stopped reply (and any offer after it)
// just as it stores a finished one, without the suite waiting out the whole stream.
async function stopReply(page: Page, nth: number) {
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(nth)
  await page.getByRole('button', { name: '정지' }).click()
  await expect(page.getByRole('button', { name: '보내기' })).toBeVisible()
}

async function say(page: Page, text: string, nth: number) {
  await page.getByLabel('이어서 이야기하기').fill(text)
  await page.getByRole('button', { name: '보내기' }).click()
  await stopReply(page, nth)
}

test('after four messages the AI offers wrap-up, in place of the header button, and the offer survives a reload', async ({
  page,
}) => {
  created.push(await startChatEntry(page, `E2E 정리 제안 ${Date.now()}`))
  await stopReply(page, 1)
  const wrapUp = page.getByRole('button', { name: '일기로 정리하기' })
  const log = page.getByRole('log', { name: '대화' })

  await say(page, '회의가 길었어', 2)
  await say(page, '자료를 아무도 안 봤어', 3)
  // Before the offer, the header has the button.
  await expect(wrapUp).toHaveCount(1)
  await expect(log.getByText(OFFER)).toHaveCount(0)

  await say(page, '퇴근길 노을은 예뻤어', 4)
  await expect(log.getByText(OFFER)).toBeVisible()
  // Never both at once: the only 일기로 정리하기 left is the offer's.
  await expect(wrapUp).toHaveCount(1)
  await expect(log.getByRole('button', { name: '일기로 정리하기' })).toBeVisible()

  // Stored by the server, not just drawn: it comes back after a reload. The offer is
  // written after the reply, so the first reload can beat it.
  await expect(async () => {
    await page.reload()
    await expect(log.getByText(OFFER)).toBeVisible({ timeout: 1000 })
  }).toPass()

  // 조금 더 얘기할게요 puts it away; the header button stays away too.
  await page.getByRole('button', { name: '조금 더 얘기할게요' }).click()
  await expect(log.getByText(OFFER)).toHaveCount(0)
  await expect(wrapUp).toHaveCount(0)
})

test('the header’s 일기로 정리하기 drafts the 일기, retrying after a failure', async ({ page }) => {
  const id = await startChatEntry(page, `E2E 직접 정리 ${Date.now()}`)
  created.push(id)
  await stopReply(page, 1)

  await page.route('**/api/diary/*/wrap-up', (route) => route.fulfill({ status: 502 }))
  await page.getByRole('button', { name: '일기로 정리하기' }).click()
  const failed = page.getByRole('main').getByRole('alert')
  await expect(failed).toContainText('일기로 정리하지 못했어요')
  await expect(failed).toContainText('대화는 그대로 남아 있어요.')

  await page.unroute('**/api/diary/*/wrap-up')
  const drafted = page.waitForResponse((r) => r.url().endsWith(`/api/diary/${id}/wrap-up`))
  await page.getByRole('button', { name: '다시 정리' }).click()
  expect((await drafted).ok()).toBe(true)

  // Wrapped up: no more button, and the sidebar drops its 정리 전 badge.
  await expect(page.getByRole('button', { name: '일기로 정리하기' })).toHaveCount(0)
  await expect(failed).toHaveCount(0)
  const row = page.getByRole('navigation', { name: '지난 일기' }).locator(`a[href="/diary/${id}"]`)
  await expect(row).not.toContainText('정리 전')
})
