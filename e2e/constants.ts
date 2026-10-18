import { basename } from 'node:path'

// Each run gets its own identity, so two sessions can run E2E at once (#87). They used to
// share port 3100 and one `e2e-test-user`, and `withdrawal.spec.ts` wiping that user in
// one run deleted the other run's entries mid-test.
//
// The run id is the worktree's folder name (every session works in its own worktree), or
// `E2E_RUN_ID` to run two suites side by side from one folder.
function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'run'
  )
}

// FNV-1a: a stable, dependency-free hash so the same worktree always gets the same port.
function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

export const E2E_RUN_ID = slug(process.env.E2E_RUN_ID ?? basename(process.cwd()))

/** 3100–3899, fixed per run id. Two ids can still land on one port (1 in 800): set E2E_PORT. */
export const E2E_PORT = Number(process.env.E2E_PORT) || 3100 + (hash(E2E_RUN_ID) % 800)

// A dedicated identity so E2E rows never mix with a real account's diaries — and, per run,
// never with another run's. Nothing cleans up by date range alone, so every spec is
// responsible for removing what it wrote.
export const E2E_USER_ID = `e2e-test-user-${E2E_RUN_ID}`
export const E2E_SECRET = process.env.E2E_AUTH_SECRET ?? 'local-e2e-secret'

/** Where the signed-in cookie is saved; per run, so two runs never read each other's. */
export const E2E_STATE = `e2e/.auth/state-${E2E_RUN_ID}.json`
