// A dedicated identity so E2E rows never mix with a real account's diaries. Nothing
// cleans up by date range alone, so every spec is responsible for removing what it wrote.
export const E2E_USER_ID = 'e2e-test-user'
export const E2E_SECRET = process.env.E2E_AUTH_SECRET ?? 'local-e2e-secret'
