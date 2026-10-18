import { expect, type Page } from '@playwright/test'

const ENTRY_URL = /\/diary\/([0-9a-f-]{36})$/

/**
 * Writes a new entry through the write page and returns its id, read from the detail URL
 * the save lands on. Every save is a new row now (a date holds any number of entries), so
 * whoever calls this owns the row — pair it with `removeEntries`.
 */
export async function writeEntry(page: Page, date: string, body: string) {
  await page.goto(`/diary/write?date=${date}`)
  await page.getByPlaceholder('오늘 하루는 어땠나요?').fill(body)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page).toHaveURL(ENTRY_URL)
  return ENTRY_URL.exec(page.url())![1]
}

/** Deletes entries by id. Already-gone ids succeed, so it is safe after a delete test. */
export async function removeEntries(page: Page, ids: string[]) {
  for (const id of ids) {
    await page.request.delete(`/api/diary/${id}`)
  }
}

/**
 * Starts a 대화로 쓰기 entry from the home with `message` and returns its id once the entry
 * page has sent that first message and the server has stored it (the response headers
 * come after the insert). Pair it with `removeEntries`.
 */
export async function startChatEntry(page: Page, message: string) {
  await page.goto('/diary')
  await page.getByLabel('오늘 이야기').fill(message)
  const stored = page.waitForResponse(
    (r) => r.url().includes('/messages') && r.request().method() === 'POST'
  )
  await page.getByRole('button', { name: '보내기' }).click()
  await expect(page).toHaveURL(ENTRY_URL)
  const id = ENTRY_URL.exec(page.url())![1]
  await stored
  return id
}
