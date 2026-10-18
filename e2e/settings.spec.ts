import { test, expect } from '@playwright/test'

// The browser's own zone is stored on the first visit, and a later visit from a device in
// another zone does not move the user's day.
test.use({ timezoneId: 'America/New_York', locale: 'en-US' })

// "First visit" needs a user without a settings row, and a run that stopped half-way can
// leave one behind (it did: a Seoul row from an interrupted run failed the next one). So
// start from nothing: withdrawal wipes the dedicated E2E user's data, settings included.
// Every other spec creates what it needs, so wiping here takes nothing from them.
test.beforeEach(async ({ request }) => {
  expect((await request.delete('/api/account')).ok()).toBe(true)
})

const initSent = (page: import('@playwright/test').Page) =>
  page.waitForResponse((r) => r.url().endsWith('/api/settings') && r.request().method() === 'POST')

test('the first visit stores the browser time zone, and a later one does not overwrite it', async ({
  page,
  browser,
}) => {
  const first = initSent(page)
  await page.goto('/diary')
  expect((await first).ok()).toBe(true)

  const stored = await (await page.request.get('/api/settings')).json()
  expect(stored.stored).toBe(true)
  expect(stored.settings.timezone).toBe('America/New_York')

  // Same account, another device in Seoul.
  const seoul = await browser.newContext({
    storageState: 'e2e/.auth/state.json',
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
  })
  const other = await seoul.newPage()
  const second = initSent(other)
  await other.goto('/diary')
  expect((await second).ok()).toBe(true)

  const after = await (await other.request.get('/api/settings')).json()
  expect(after.settings.timezone).toBe('America/New_York')
  await seoul.close()
})
