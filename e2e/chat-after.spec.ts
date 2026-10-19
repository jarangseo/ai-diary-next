import { test, expect, type Page } from '@playwright/test'
import { removeEntries, startChatEntry } from './entries'

// After wrap-up (#83, screens 1-2 / 1-3): the 일기 at the centre, the conversation in a
// side panel on a wide screen and a tab on a phone. The draft is the deterministic one the
// wrap-up API makes in test runs: the user's own words, titled with the first message.

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

/** Starts an entry with `message`, stops the reply and wraps it up from the header. */
async function wrappedUpEntry(page: Page, message: string) {
  created.push(await startChatEntry(page, message))
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(1)
  await page.getByRole('button', { name: '정지' }).click()
  await page.getByRole('button', { name: '일기로 정리하기' }).click()
  await expect(page.getByRole('heading', { level: 1, name: message })).toBeVisible()
}

test('the 일기 takes the centre and the conversation opens beside it', async ({ page }) => {
  const message = `E2E 노을 ${Date.now()}`
  await wrappedUpEntry(page, message)

  // The completion moment, the 일기 in the user's words and what it was made from.
  await expect(page.getByText('방금 일기가 완성됐어요')).toBeVisible()
  await expect(
    page.getByRole('article').getByRole('paragraph').filter({ hasText: message })
  ).toBeVisible()
  await expect(page.getByText(/^대화 1개를 정리했어요 · /)).toBeVisible()

  // The conversation is folded away until asked for.
  const log = page.getByRole('log', { name: '대화' })
  await expect(log).toBeHidden()
  const toggle = page.getByRole('button', { name: '대화 보기' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await toggle.click()
  await expect(log).toBeVisible()
  await expect(log.getByRole('separator', { name: '여기까지 일기로 정리했어요' })).toBeVisible()
  // Focus moves into the panel, and back to its toggle when it closes.
  const close = page
    .getByRole('region', { name: '대화' })
    .getByRole('button', { name: '대화 닫기' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(log).toBeHidden()
  await expect(page.getByRole('button', { name: '대화 보기' })).toBeFocused()

  // A reload shows the same 일기, without replaying the completion moment.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: message })).toBeVisible()
  await expect(page.getByText(/^대화 1개를 정리했어요 · /)).toBeVisible()
  await expect(page.getByText('방금 일기가 완성됐어요')).toHaveCount(0)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the 일기 and the 대화 are tabs, on the 일기 first', async ({ page }) => {
    const message = `E2E 모바일 ${Date.now()}`
    await wrappedUpEntry(page, message)

    const diaryTab = page.getByRole('tab', { name: '일기' })
    const chatTab = page.getByRole('tab', { name: '대화' })
    await expect(diaryTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel', { name: '일기' })).toBeVisible()
    await expect(page.getByRole('button', { name: '대화 보기' })).toBeHidden()

    await chatTab.click()
    await expect(chatTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { level: 1, name: message })).toBeHidden()
    const log = page.getByRole('log', { name: '대화' })
    await expect(log.getByRole('separator', { name: '여기까지 일기로 정리했어요' })).toBeVisible()

    // Arrow keys move between the tabs.
    await page.keyboard.press('ArrowLeft')
    await expect(diaryTab).toBeFocused()
    await expect(page.getByRole('heading', { level: 1, name: message })).toBeVisible()
  })
})
