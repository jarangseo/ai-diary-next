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
