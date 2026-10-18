import { test, expect } from '@playwright/test'

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

test('the v1 list stays reachable by URL', async ({ page }) => {
  await page.goto('/diary?view=list')
  await expect(page.getByRole('tab', { name: '목록' })).toHaveAttribute('aria-selected', 'true')
})
