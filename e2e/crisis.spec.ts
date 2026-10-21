import { test, expect } from '@playwright/test'
import { removeEntries, startChatEntry } from './entries'

// Crisis (#77, spec 5-2 "위기 응답"). Test runs use the fake stream and no moderation call,
// so the word list is what fires here. The country comes from the stored settings: the
// locale's region first, else the zone. Each test stores locale `ko` (no region, as a
// Korean user's is) and the zone it needs, and the originals are put back after — the
// run's user otherwise keeps whatever its browser sent on the first visit (`en-US`).

const created: string[] = []
let original: { timezone: string; locale: string }
test.beforeEach(async ({ page }) => {
  original = (await (await page.request.get('/api/settings')).json()).settings
})
test.afterEach(async ({ page }) => {
  await removeEntries(page, created.splice(0))
  await page.request.patch('/api/settings', {
    data: { timezone: original.timezone, locale: original.locale },
  })
})
const setZone = (page: import('@playwright/test').Page, timezone: string) =>
  page.request.patch('/api/settings', { data: { timezone, locale: 'ko' } })

test('a message that signals a crisis gets the crisis lines under the reply', async ({ page }) => {
  await setZone(page, 'Asia/Seoul')
  created.push(await startChatEntry(page, `E2E 요즘 죽고 싶다는 생각이 들어 ${Date.now()}`))

  const card = page.getByRole('region', { name: '지금 이야기할 수 있는 곳' })
  await expect(card).toBeVisible()
  await expect(card.getByRole('link', { name: '자살예방상담전화 109에 전화하기' })).toHaveAttribute(
    'href',
    'tel:109'
  )
  await expect(
    card.getByRole('link', { name: '정신건강위기상담전화 1577-0199에 전화하기' })
  ).toHaveAttribute('href', 'tel:15770199')
  await expect(card.getByText('지금 당장 위험하다면 112나 119에 연락해 주세요.')).toBeVisible()
  await expect(
    card.getByText('상담을 대신할 수는 없지만 여기서 계속 이야기를 들을게요.')
  ).toBeVisible()

  // Stopping the reply keeps the card: it was sent before the words. (A reply stopped
  // before its first word is not stored at all, card or not, as before.)
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(1)
  await page.getByRole('button', { name: '정지' }).click()
  await page.reload()
  await expect(card).toBeVisible()
})

test('an everyday message gets no crisis card', async ({ page }) => {
  created.push(await startChatEntry(page, `E2E 회의가 길어서 지쳤어 ${Date.now()}`))
  await expect(page.getByRole('log', { name: '대화' }).getByText(/읽어보니/)).toHaveCount(1)
  await expect(page.getByRole('region', { name: '지금 이야기할 수 있는 곳' })).toHaveCount(0)
})

test('a country without lines gets the directory placeholder and the emergency line', async ({
  page,
}) => {
  await setZone(page, 'Europe/Berlin')
  created.push(await startChatEntry(page, `E2E 사라지고 싶어 ${Date.now()}`))

  const card = page.getByRole('region', { name: '지금 이야기할 수 있는 곳' })
  // TODO(#77): a link once the international directory is chosen.
  await expect(card.getByText('[국제 상담 전화 안내 사이트 — 출시 전 결정]')).toBeVisible()
  await expect(
    card.getByText('지금 당장 위험하다면 가까운 응급 번호로 연락해 주세요.')
  ).toBeVisible()
  await expect(card.getByRole('link')).toHaveCount(0)
})
