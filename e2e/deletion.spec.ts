import { test, expect } from '@playwright/test'
import { removeEntries, writeEntry } from './entries'

// Its own date so it never races the specs that reuse a fixed one.
const DATE = '2020-01-03'

test('an entry can be deleted, and stays deleted', async ({ page }) => {
  const body = `Deletion E2E ${Date.now()}`

  const id = await writeEntry(page, DATE, body)
  await expect(page.getByRole('main').getByText(body)).toBeVisible()

  // Two steps on purpose — a native confirm() would be dismissed by automation, leaving
  // the destructive path untested.
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('group', { name: '이 일기와 대화를 모두 지울까요?' }).waitFor()
  await page
    .getByRole('group', { name: '이 일기와 대화를 모두 지울까요?' })
    .getByRole('button', { name: '삭제' })
    .click()

  await expect(page).toHaveURL(/\/diary$/)

  // Gone from the server, not just from this render.
  const response = await page.request.get(`/api/diary/${id}`)
  expect(response.status()).toBe(404)
})

test('cancelling leaves the entry alone', async ({ page }) => {
  const body = `Deletion cancel E2E ${Date.now()}`

  const id = await writeEntry(page, DATE, body)

  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page.getByRole('button', { name: '취소' }).click()

  await page.reload()
  await expect(page.getByRole('main').getByText(body)).toBeVisible()

  await removeEntries(page, [id])
})
