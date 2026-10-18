import { test, expect } from '@playwright/test'
import { removeEntries, writeEntry } from './entries'

// A date far outside any real usage. Every save is a new row, so each test removes what
// it wrote.
const DATE = '2020-01-01'

const created: string[] = []
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
})

test('writing an entry saves it and shows it on the detail page', async ({ page }) => {
  const body = `E2E entry ${Date.now()}`

  // Saving replaces the write page in history, so the detail page is where it lands.
  const id = await writeEntry(page, DATE, body)
  created.push(id)

  await expect(page.getByRole('main').getByText(body)).toBeVisible()
})

test('editing keeps the entry and its id', async ({ page }) => {
  const id = await writeEntry(page, DATE, `E2E before ${Date.now()}`)
  created.push(id)

  const edit = page.getByRole('link', { name: '수정' })
  await expect(edit).toHaveAttribute('href', `/diary/write?id=${id}`)
  await edit.click()

  const editor = page.getByPlaceholder('오늘 하루는 어땠나요?')
  // The prefill arrives after the page renders; wait for it before replacing it.
  await expect(editor).not.toHaveValue('')
  const edited = `E2E after ${Date.now()}`
  await editor.fill(edited)
  await page.getByRole('button', { name: '수정' }).click()

  await expect(page).toHaveURL(new RegExp(`/diary/${id}$`))
  await expect(page.getByRole('main').getByText(edited)).toBeVisible()
})

// The bug behind issue #47: a second entry on a date made the date-keyed detail route
// error, because it could only resolve one row per date.
test('two entries on one date both open by id', async ({ page }) => {
  const first = `E2E first ${Date.now()}`
  const second = `E2E second ${Date.now()}`
  const a = await writeEntry(page, DATE, first)
  created.push(a)
  const b = await writeEntry(page, DATE, second)
  created.push(b)

  expect(a).not.toBe(b)

  for (const [id, body] of [
    [a, first],
    [b, second],
  ]) {
    const response = await page.goto(`/diary/${id}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('main').getByText(body)).toBeVisible()
  }

  const list = await page.request.get(`/api/diary?date=${DATE}`)
  expect(list.status()).toBe(200)
  const ids = ((await list.json()) as { id: string }[]).map((d) => d.id)
  expect(ids).toEqual(expect.arrayContaining([a, b]))
})

test('an old date URL opens that day’s list', async ({ page }) => {
  const body = `E2E old link ${Date.now()}`
  created.push(await writeEntry(page, DATE, body))

  await page.goto(`/diary/${DATE}`)
  await expect(page).toHaveURL(new RegExp(`/diary\\?view=list&date=${DATE}$`))
  await expect(page.getByRole('main').getByText(body)).toBeVisible()
})
