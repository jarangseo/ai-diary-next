# Harness

How work gets handed to an autonomous loop, and what must never be.

## The premise: a loop is only as good as its oracle

Two assumptions were refuted by measurement on this project in a single day: that
re-rendering was the streaming bottleneck (it was 5ms of a 48ms interaction) and that
Suspense would improve loading (it took LCP from 592ms to 5,640ms). Both changes passed
typecheck, lint, unit tests and the bundle budget. **An unattended loop would have shipped
the second one.**

So the first question for any task is not "can an agent do this" but **"what will tell us
it is done, without a human looking"**. Tasks that have an answer can be delegated. Tasks
that do not, cannot — no matter how mechanical they look.

| Delegable — the check is mechanical | Not delegable — the check is judgement |
| --- | --- |
| Wire the thread into the detail page (E2E asserts it) | Whether to ship Suspense |
| Spend caps (the N+1th request is a 429) | Landing copy and tone |
| Remove the seed and the lab route (grep returns nothing) | Whether a 5s delay is acceptable |
| Refactors, test coverage | Production database changes, deploys |

## The oracle

```bash
pnpm verify
```

`typecheck → lint → format:check → test:run → build → check:bundle-budget → test:e2e`

One command, on purpose. Given several, an agent runs some of them.

Everything before `test:e2e` answers *"is this code coherent"*. Only `test:e2e` answers
*"does the feature work"* — all the rest pass on a page that renders nothing, which makes
them a poor oracle for "implement X".

### E2E

- Runs against a **production build** on port 3100 — the artefact that ships.
- Signs in through a credentials provider that **only exists when `E2E_AUTH_SECRET` is
  set**, which is nowhere but the test run. Unset, the provider is not registered, so
  there is no path to authenticate through it. It also checks the value, not just the
  presence: if it were ever set in a deployed environment it would be account takeover.
- Writes under a dedicated `e2e-test-user` on a fixed far-past date, so runs update one
  row instead of accumulating, and never touch a real account's entries.
- `test.fixme` marks the oracle for work not yet done. `thread.spec.ts` is the acceptance
  test for putting the thread on the diary detail page: remove `fixme` as part of that
  task, and if it passes, the task is done.

Two things this cost, worth not re-learning:

- **`127.0.0.1`, never `localhost`.** Chromium resolves `localhost` to `::1` first and the
  server binds IPv4, which surfaces as `ERR_CONNECTION_REFUSED` in the browser while curl
  and Playwright's request context both work.
- **The run owns its server** (`reuseExistingServer: false`). Reusing whatever is
  listening let tests start against a socket that was still shutting down.

## Running a loop

```
/loop Take the first unchecked item in docs/TODAY_PLAN.md. Implement it, run
`pnpm verify`, and only if it passes, commit and tick the box. On failure, fix and
retry at most twice, then stop and report. Never touch the production database,
deployment, or anything that spends money.
```

State lives in the plan file rather than in context, so a loop that loses its context can
pick up where it stopped.

**Stop after two failures.** Unbounded retry is the characteristic failure of this setup:
an agent that cannot pass the check will keep changing things until the check passes for
the wrong reason.

## What stays with a person

- Production database writes
- Deploys, and when to do them
- Anything that spends money (a public link means strangers spend it)
- Reading performance numbers and deciding what *not* to fix
- Product copy and tone

## When this is worth it

Setting this up costs roughly ninety minutes. Against six remaining tasks, doing them by
hand is faster. The break-even is *number of tasks × how often they repeat* — not how
appealing automation sounds.

The E2E suite is worth having either way: it is the only check that fails when the product
is broken.
