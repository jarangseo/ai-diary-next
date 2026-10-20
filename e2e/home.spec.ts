import { test, expect } from '@playwright/test'
import { removeEntries } from './entries'
import { todayIn } from '../src/lib/entryGroups'

const ENTRY_URL = /\/diary\/([0-9a-f-]{36})$/

// Screen 1-0, the home (#81). The E2E user is signed in with the name 'E2E'.

test('greets the user by name, with 대화로 쓰기 chosen and 직접 쓰기 not yet available', async ({
  page,
}) => {
  await page.goto('/diary')

  // The run's user has no entries here, so this is the first-run greeting (#85); the
  // returning one is checked in first-run.spec.ts.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'E2E님, 반가워요.오늘은 어땠어요?'
  )

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

test('counts down from 1,800 characters and refuses more than 2,000', async ({ page }) => {
  await page.goto('/diary')
  const input = page.getByLabel('오늘 이야기')
  const send = page.getByRole('button', { name: '보내기' })

  await input.fill('가'.repeat(1799))
  await expect(page.getByText(/자 (남았어요|넘었어요)$/)).toHaveCount(0)

  await input.fill('가'.repeat(1800))
  await expect(input).toHaveAccessibleDescription('200자 남았어요')
  await expect(send).toBeEnabled()

  await input.fill('가'.repeat(2000))
  await expect(input).toHaveAccessibleDescription('0자 남았어요')
  await expect(send).toBeEnabled()

  // Pasted text is kept whole, not cut at the limit; sending waits until it fits.
  await input.fill('가'.repeat(2001))
  await expect(input).toHaveAccessibleDescription('1자 넘었어요')
  await expect(send).toBeDisabled()
  await input.press('Enter')
  await expect(page).toHaveURL(/\/diary$/)
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

    // Handed to the entry page, which sends it as the conversation's first message.
    await expect(page.getByRole('log', { name: '대화' }).getByText(message)).toBeVisible()
  })

  test('on a desktop, Shift+Enter is a new line and Enter sends', async ({ page }) => {
    await page.goto('/diary')
    const input = page.getByLabel('오늘 이야기')
    await expect(page.getByText('Enter 보내기 · Shift+Enter 줄바꿈')).toBeVisible()

    await input.pressSequentially('첫 줄')
    await input.press('Shift+Enter')
    await input.pressSequentially('둘째 줄')
    await expect(input).toHaveValue('첫 줄\n둘째 줄')
    await expect(page).toHaveURL(/\/diary$/)

    await input.press('Enter')
    await expect(page).toHaveURL(ENTRY_URL)
    created.push(ENTRY_URL.exec(page.url())![1])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('Enter is a new line and only the button sends', async ({ page }) => {
      await page.goto('/diary')
      const input = page.getByLabel('오늘 이야기')
      await expect(page.getByText('Enter 보내기 · Shift+Enter 줄바꿈')).toBeHidden()

      await input.pressSequentially('첫 줄')
      await input.press('Enter')
      await input.pressSequentially('둘째 줄')
      await expect(input).toHaveValue('첫 줄\n둘째 줄')
      await expect(page).toHaveURL(/\/diary$/)

      await page.getByRole('button', { name: '보내기' }).tap()
      await expect(page).toHaveURL(ENTRY_URL)
      created.push(ENTRY_URL.exec(page.url())![1])
    })
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
