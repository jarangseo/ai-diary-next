import { test, expect } from '@playwright/test'
import { removeEntries } from './entries'
import { todayIn } from '../src/lib/entryGroups'

const ENTRY_URL = /\/diary\/([0-9a-f-]{36})$/

// Screen 1-0, the home (#81). The E2E user is signed in with the name 'E2E'.

test('greets the user by name, with 대화로 쓰기 chosen and 직접 쓰기 not yet available', async ({
  page,
}) => {
  await page.goto('/diary')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E님,오늘은 어땠어요?')

  const modes = page.getByRole('group', { name: '쓰는 방식' })
  await expect(modes.getByRole('button', { name: '대화로 쓰기' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  const write = modes.getByRole('button', { name: '직접 쓰기' })
  await expect(write).toHaveAttribute('aria-disabled', 'true')
  await expect(write).toHaveAccessibleDescription('직접 쓰기는 다음 업데이트에서 열려요.')
})

test('send is disabled while the input is empty or only spaces', async ({ page }) => {
  await page.goto('/diary')
  const input = page.getByLabel('오늘 이야기')
  const send = page.getByRole('button', { name: '보내기' })

  await expect(send).toBeDisabled()
  await input.fill('   \n  ')
  await expect(send).toBeDisabled()
  await input.fill('오늘은 산책을 했어')
  await expect(send).toBeEnabled()
})

test.describe('the first message', () => {
  // Pin the browser and the stored zone to one that is neither UTC nor the server's, so
  // "today" can only come from the stored setting.
  const ZONE = 'America/New_York'
  test.use({ timezoneId: ZONE })

  const created: string[] = []
  test.beforeEach(async ({ page }) => {
    expect((await page.request.patch('/api/settings', { data: { timezone: ZONE } })).ok()).toBe(
      true
    )
  })
  test.afterEach(async ({ page }) => {
    await removeEntries(page, created.splice(0))
  })

  test('creates a chat entry for today and lands on /diary/{id}, text out of the URL', async ({
    page,
  }) => {
    const message = `E2E first message ${Date.now()}`
    await page.goto('/diary')
    await page.getByLabel('오늘 이야기').fill(message)
    await page.getByRole('button', { name: '보내기' }).click()

    await expect(page).toHaveURL(ENTRY_URL)
    const id = ENTRY_URL.exec(page.url())![1]
    created.push(id)
    expect(page.url()).not.toContain(encodeURIComponent(message))

    const entry = await (await page.request.get(`/api/diary/${id}`)).json()
    expect(entry).toMatchObject({ mode: 'chat', content: '', date: todayIn(new Date(), ZONE) })

    // Handed to the entry page for the 대화 중 screen (#82) to send.
    const handed = await page.evaluate((key) => sessionStorage.getItem(key), `first-message:${id}`)
    expect(handed).toBe(message)
  })

  test('keeps the text and says so when the entry cannot be created', async ({ page }) => {
    await page.route('/api/diary', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 500 }) : route.continue()
    )
    await page.goto('/diary')
    const input = page.getByLabel('오늘 이야기')
    await input.fill('오늘은 산책을 했어')
    await page.getByRole('button', { name: '보내기' }).click()

    // Inside main: Next's route announcer is an alert too.
    await expect(page.getByRole('main').getByRole('alert')).toContainText('쓴 글은 그대로 있어요')
    await expect(input).toHaveValue('오늘은 산책을 했어')
    await expect(page).toHaveURL(/\/diary$/)
  })
})

test('the v1 list stays reachable by URL', async ({ page }) => {
  await page.goto('/diary?view=list')
  await expect(page.getByRole('tab', { name: '목록' })).toHaveAttribute('aria-selected', 'true')
})
