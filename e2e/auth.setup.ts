import { test as setup, expect } from '@playwright/test'
import { E2E_SECRET, E2E_USER_ID } from './constants'

const STATE = 'e2e/.auth/state.json'

// Drives NextAuth's credentials callback directly rather than through a form: there is
// no sign-in UI for this provider, and OAuth consent screens cannot be automated.
setup('sign in', async ({ request }) => {
  const csrfResponse = await request.get('/api/auth/csrf')
  expect(csrfResponse.ok()).toBeTruthy()
  const { csrfToken } = await csrfResponse.json()

  const signIn = await request.post('/api/auth/callback/e2e', {
    form: { csrfToken, secret: E2E_SECRET, userId: E2E_USER_ID, callbackUrl: '/diary' },
    maxRedirects: 0,
  })
  // NextAuth answers a successful credentials callback with a redirect, not a 200.
  expect(signIn.status(), 'credentials sign-in should redirect').toBeLessThan(400)

  // Saved from the *request* context: that is where the sign-in cookie landed. The page
  // context never navigated, so its jar is empty and the saved state would authenticate
  // nothing.
  await request.storageState({ path: STATE })

  // Prove the cookie actually authenticates, so a broken session fails here rather than
  // as a confusing redirect inside every other spec.
  const session = await request.get('/api/auth/session')
  expect(await session.json()).toMatchObject({ user: { id: E2E_USER_ID } })
})
