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

test('drafting locks the input, and a failure keeps the conversation', async ({ page }) => {
  const message = `E2E 정리중 ${Date.now()}`
  created.push(await startChatEntry(page, message))
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(1)
  await page.getByRole('button', { name: '정지' }).click()

  // Held until the drafting state has been seen, then failed once.
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/wrap-up', async (route) => {
    await held
    await route.fulfill({ status: 502, json: { error: 'Could not draft' } })
  })
  const input = page.getByRole('textbox', { name: '이어서 이야기하기' })
  await page.getByRole('button', { name: '일기로 정리하기' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: '대화를 일기로 정리하고 있어요' })
  ).toBeVisible()
  await expect(input).not.toBeEditable()
  release()

  // Shown once, not under every reply.
  await expect(page.getByRole('alert').filter({ hasText: '일기로 정리하지 못했어요' })).toHaveCount(
    1
  )
  await expect(input).toBeEditable()

  // 다시 정리 goes through once the server answers again.
  await page.unroute('**/wrap-up')
  await page.getByRole('button', { name: '다시 정리' }).click()
  await expect(page.getByRole('heading', { level: 1, name: message })).toBeVisible()
  await expect(page.getByText('일기로 정리하지 못했어요')).toHaveCount(0)
})

test('talking on after the draft offers 다시 정리', async ({ page }) => {
  const message = `E2E 이어서 ${Date.now()}`
  await wrappedUpEntry(page, message)
  await expect(page.getByText('정리한 뒤에 나눈 대화가 있어요')).toHaveCount(0)

  await page.getByRole('button', { name: '대화 보기' }).click()
  const log = page.getByRole('log', { name: '대화' })
  await page.getByRole('textbox', { name: '이어서 이야기하기' }).fill('E2E 하나 더')
  await page.keyboard.press('Enter')
  await expect(log.getByText(/읽어보니/)).toHaveCount(2)
  await page.getByRole('button', { name: '정지' }).click()

  const stale = page.getByRole('status').filter({ hasText: '정리한 뒤에 나눈 대화가 있어요' })
  await expect(stale).toBeVisible()
  await stale.getByRole('button', { name: '다시 정리' }).click()
  await expect(stale).toHaveCount(0)
  await expect(page.getByText(/^대화 2개를 정리했어요 · /)).toBeVisible()
})

test('다듬기 keeps the user’s edit, and 다시 정리 asks before replacing it', async ({ page }) => {
  const message = `E2E 다듬기 ${Date.now()}`
  await wrappedUpEntry(page, message)
  const diary = page.getByRole('article')

  await page.getByRole('button', { name: '다듬기' }).click()
  const editor = page.getByRole('textbox', { name: '일기 다듬기' })
  await expect(editor).toBeFocused()
  await editor.fill('내가 고친 일기')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(diary.getByText('내가 고친 일기')).toBeVisible()
  await expect(page.getByRole('button', { name: '다듬기' })).toBeFocused()

  // Stored, not just shown.
  await page.reload()
  await expect(diary.getByText('내가 고친 일기')).toBeVisible()

  // Talking on outdates it; 다시 정리 warns first, and cancel keeps the edit.
  await page.getByRole('button', { name: '대화 보기' }).click()
  await page.getByRole('textbox', { name: '이어서 이야기하기' }).fill('E2E 덧붙임')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(2)
  await page.getByRole('button', { name: '정지' }).click()
  await diary.getByRole('button', { name: '다시 정리' }).click()
  const confirm = page.getByRole('alert').filter({ hasText: '다시 정리하면 고친 부분이 바뀌어요' })
  await confirm.getByRole('button', { name: '취소' }).click()
  await expect(confirm).toHaveCount(0)
  await expect(diary.getByText('내가 고친 일기')).toBeVisible()

  await diary.getByRole('button', { name: '다시 정리' }).click()
  await confirm.getByRole('button', { name: '다시 정리' }).click()
  await expect(diary.getByText('내가 고친 일기')).toHaveCount(0)
  await expect(page.getByText(/^대화 2개를 정리했어요 · /)).toBeVisible()
})

test('the emotion chip changes the emotion, and 다시 정리 keeps the pick (#84)', async ({
  page,
}) => {
  const message = `E2E 감정 ${Date.now()}`
  await wrappedUpEntry(page, message)
  // CI has no model key, so no analysis lands: seed an emotion through the same endpoint.
  const id = created[created.length - 1]
  expect(
    (await page.request.patch(`/api/diary/${id}/emotion`, { data: { primary: 'calm' } })).ok()
  ).toBe(true)
  await page.reload()

  const chip = page.getByRole('button', { name: '감정 바꾸기: 평온' })
  await chip.click()
  const picker = page.getByRole('form', { name: '감정 바꾸기' })
  const primary = picker.getByRole('group', { name: '주된 감정' })
  const secondary = picker.getByRole('group', { name: '함께 느낀 감정' })
  await expect(primary.getByRole('radio', { name: '평온' })).toBeFocused()
  await primary.getByRole('radio', { name: '기쁨' }).check()
  // The secondary cannot repeat the primary.
  await expect(secondary.getByRole('radio', { name: '기쁨' })).toBeDisabled()
  await secondary.getByRole('radio', { name: '설렘' }).check()
  await picker.getByRole('button', { name: '저장' }).click()

  const picked = page.getByRole('button', { name: '감정 바꾸기: 기쁨 · 설렘' })
  await expect(picked).toBeFocused()
  await expect(picker).toHaveCount(0)
  await page.reload()
  await expect(picked).toBeVisible()

  // Talking on and 다시 정리 make a new draft; the user's pick stays.
  await page.getByRole('button', { name: '대화 보기' }).click()
  await page.getByRole('textbox', { name: '이어서 이야기하기' }).fill('E2E 감정 덧붙임')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(2)
  await page.getByRole('button', { name: '정지' }).click()
  await page.getByRole('article').getByRole('button', { name: '다시 정리' }).click()
  await expect(page.getByText(/^대화 2개를 정리했어요 · /)).toBeVisible()
  await page.reload()
  await expect(picked).toBeVisible()
})
