import { defineConfig, devices } from '@playwright/test'

// E2E exists to answer the question the other checks cannot: does the feature work?
// typecheck, lint, unit tests and the bundle budget all pass on a page that renders
// nothing, which makes them a poor oracle for "implement X" — see docs/HARNESS.md.
//
// Runs against a production build, because that is the artefact that ships and because
// dev-mode timing and behaviour differ enough to hide real problems.
const PORT = 3100
// 127.0.0.1, not localhost: Chromium resolves `localhost` to ::1 first, and the dev
// server binds IPv4 only — which shows up as ERR_CONNECTION_REFUSED in the browser while
// curl and Playwright's request context (both of which fall back) work fine.
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Serial by default: the specs share one database and one seeded user, so parallel
  // runs would race on the same rows.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Signs in once and saves the cookie; every other project reuses it.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/state.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: BASE_URL,
    // The run owns its server. Reusing one that happens to be listening made tests
    // start against a socket that was still shutting down, which surfaced as
    // ERR_CONNECTION_REFUSED in the browser while the API context still worked — an
    // hour of debugging a problem that was never in the app.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // The gate that makes the E2E sign-in provider exist at all. Absent everywhere else.
      E2E_AUTH_SECRET: process.env.E2E_AUTH_SECRET ?? 'local-e2e-secret',
      // Without this, NextAuth resolves redirects against the AUTH_URL in .env.local —
      // which points at the development server — and signing out walks the test straight
      // off the server under test.
      AUTH_URL: BASE_URL,
      NEXTAUTH_URL: BASE_URL,
    },
  },
})
