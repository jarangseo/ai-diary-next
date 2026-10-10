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
- **Optimistic UI needs an explicit wait before asserting persistence.** A message is
  painted the instant it is sent, so seeing it proves nothing about the server having it.
  A test that reloads on the strength of that render is racing the insert — and will pass
  until the app gets faster, which is a memorable way to find out.
- **Deleting a route needs `rm -rf .next` before `verify`.** Next generates a type
  validator that imports every route it knew about; after a deletion the stale copy
  still references the missing file and `typecheck` fails on a file nobody wrote.

## Running a loop

```
/loop Work on GitHub issue #<n> (label agent-ready, assigned to me). Branch as
type/short-desc from main. Implement it, run `pnpm verify`, and only if it passes,
commit and push. When the issue's "Done when" check passes, open a draft PR that
closes #<n>, labelled agent. On failure, fix and retry at most twice, then stop,
comment on the issue with what failed, and report. Never touch the production
database, deployment, or anything that spends money.
```

State lives in the issue and the branch rather than in context, so a loop that loses its
context can pick up where it stopped. See [Working as a team](#working-as-a-team) for why
the queue moved out of the plan file.

**A state file is load-bearing.** While the queue lived in `docs/TODAY_PLAN.md`, editing it
with unchecked string replacement went wrong quietly and repeatedly: a replacement whose
pattern no longer matched did nothing and reported success, so two finished items stayed
unticked, and a bulk renumber dropped an item entirely — the deletion work was implemented
and committed while the queue no longer listed it. A corrupted state file makes every
progress report a guess. Wherever a loop keeps state in a file, assert that an edit
matched, and read the file back after changing it.

**Stop after two failures.** Unbounded retry is the characteristic failure of this setup:
an agent that cannot pass the check will keep changing things until the check passes for
the wrong reason.

## The gap: CI is weaker than the oracle

`pnpm verify` runs E2E. CI does not — it has no Supabase credentials — so the strongest
check in this repo exists only on one machine.

That is not theoretical. Both bugs the E2E caught this week passed typecheck, unit tests,
lint and format without complaint, because none of those opens a browser. Until CI runs
the suite, a pull request can break the product and be told it is fine.

The fix is a separate Supabase project for development and CI, which the repo wants
anyway. Until it lands, the rule in [Shared environments](#shared-environments) applies:
the pull request author runs `pnpm verify` locally and says so in the pull request.

## What stays with a person

- Production database writes
- Deploys, and when to do them
- Anything that spends money (a public link means strangers spend it)
- Reading performance numbers and deciding what *not* to fix
- Product copy and tone
- Numbering and applying database migrations (two branches each adding `002_…` is a
  conflict nobody sees until both are applied)
- Changing the harness itself — `CLAUDE.md`, this file, `.claude/settings.json`, the hooks.
  Each changes how every teammate's agent behaves, so these take **two** approvals.
- Approving a pull request a loop opened

## Working as a team

Everything above was written for one person running one loop on one machine. With several
people, the same setup fails in specific places. The rules below close them; the
human-facing version is in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

### The queue is GitHub Issues, not a file

A shared file queue lets two loops take the same "first unchecked item", and every branch
carries its own copy of the checkboxes, so ticking one is a merge conflict. Issues give
each task an owner and a state that lives outside every branch.

- An issue is **`agent-ready`** only when it has a *Done when* line a machine can check —
  a spec that must pass, a grep that must return nothing, a status code. The
  [agent task template](../.github/ISSUE_TEMPLATE/agent-task.yml) makes that field
  required. The delegable / not-delegable table above is the test for the label.
- **Assign before starting.** The assignee is the lock. An unassigned `agent-ready` issue
  is free; an assigned one is not, whoever's loop it is.
- **One issue, one branch, one pull request.** A loop that finds a second problem files it
  as an issue instead of fixing it in passing.

`docs/TODAY_PLAN.md` stays as the record of what was done before the move; new work goes
to Issues.

### Passing is not approving

`block-main-commit.sh` stops Claude from committing to `main` on one machine. It does not
stop a person, another tool, or a teammate without the hook. The rule that matters is
enforced by GitHub:

- `main` is protected: the `verify` and `bundle-budget` checks must pass and one review
  must approve. No force-pushes.
- **A pull request a loop opened is approved by someone other than the person who ran the
  loop.** The person who ran it has already decided the result is fine; that is the
  judgement a review exists to check.
- Loop pull requests open as drafts with the `agent` label. The person who ran the loop
  marks it ready once they have read it; a teammate approves it.

### Shared environments

- **Three databases, not one.** Production; a shared development project that CI also
  uses; and, optionally, your own local one. When the single Supabase project behind
  `.env.local` disappeared, every page returned 404 for everyone at once (see
  [the 404 that was a DNS failure](#the-404-that-was-a-dns-failure)). The development
  project has a named owner who creates it, holds its keys and answers when it is down.
  Production keys are not in anyone's `.env.local`.
- **A local database is the fallback.** `supabase start` (Supabase CLI, needs Docker) runs
  the whole stack on your machine; apply the schema from `README.md` and
  `docs/migrations/` in order, and point `.env.local` at the URL and service-role key it
  prints. The repo has no `supabase/` config yet — whoever sets it up first commits it,
  so the second person gets one command.
- **CI runs E2E.** A green check is what a reviewer trusts, so it has to include the only
  check that opens a browser. CI gets the development project's URL, service-role key and
  `E2E_AUTH_SECRET` as repository secrets and runs `pnpm test:e2e` after the build. Until
  then, see [the gap](#the-gap-ci-is-weaker-than-the-oracle).
- **Each E2E run owns its data.** Today every spec writes as `e2e-test-user`, and
  `withdrawal.spec.ts` deletes *all* of that user's rows — a teammate's run, or CI, that
  reaches it wipes yours mid-flight, and the failure looks like flakiness. The rule:
  the E2E user id carries a run id (`e2e-<run>`), each run cleans up only its own user,
  and new specs never rely on a fixed shared row. Until that change lands, don't run E2E
  against the shared database at the same time as someone else.
- **Claude settings are split by who they apply to.** `.claude/settings.json` (committed)
  holds the hooks and the `permissions.deny` list everyone needs: reading `.env` files and
  deploying. The deny list and `block-risky-commands.sh` overlap on purpose — the deny
  rules also cover the Read tool, which no Bash hook sees; the hook catches commands the
  deny patterns miss. `.claude/settings.local.json` and `CLAUDE.local.md` (both
  gitignored) hold personal permissions and preferences — anything only true for you goes
  there, not into the shared files.

### Hooks are code

A hook runs on every teammate's machine on every tool call, and a wrong one fails in one
of two ways: it blocks real work, or it silently stops blocking what it was written for.
The second is invisible until the day it matters.

- Every hook in `.claude/hooks/` ships with a `<name>.test.sh` beside it, covering what it
  must block **and** what it must let through. CI runs every `*.test.sh` in that
  directory, so a new suite needs no CI change.
- A hook change comes with a test change. Writing the suite for `block-risky-commands.sh`
  found that a force-push with `-f` as the first argument was not blocked.
- Hooks match text, not intent: the same hook blocks a commit message or a heredoc that
  merely *quotes* a blocked command. Pass such text through a file (`git commit -F`)
  rather than weakening the pattern.
- Hooks are harness: two approvals, routed by `CODEOWNERS`.

### Loops have a budget

A loop spends model tokens on the account of whoever runs it, and an agent that cannot
pass its check keeps spending until something stops it.

- **Daily budget per person: _to be set by the team_.** Set it as a spend limit on your own
  account, so it is enforced rather than remembered.
- A loop always has a stop condition: the two-failure rule above, plus a bound on
  iterations or time. No unattended loop without one.
- Automated spend in CI is bounded too: Claude review runs once per pull request, not per
  push, with a 15-minute timeout (`.github/workflows/claude-code-review.yml`).

### Improving the harness is part of the work

The harness is the set of rules every loop runs under. It gets better only if what goes
wrong is fed back into it:

- **The first time** someone — person or agent — hits a trap, record it: here under
  *worth not re-learning*, or in `CLAUDE.md` under Gotchas. By pull request, like code.
- **The second time**, a note has failed. Turn it into something mechanical: a hook, a
  lint rule, a test, a CI step. A rule that is only written down is followed by whoever
  read it.
- **Every two weeks**, look at the loop pull requests that were closed unmerged or needed
  heavy rework and sort them by cause: the *Done when* was too weak, the issue was too
  big, or the context (`CLAUDE.md`, this file) was missing something. Each cause has a
  different fix.

Harness changes go through review like any other change, with **two** approvals instead
of one; `CODEOWNERS` routes them. GitHub sets the approval count per branch, not per path,
so the second approval is the reviewers' rule: the pull request template asks for it.

### The 404 that was a DNS failure

`GET /api/diary/<date>` returned 404 while the server was healthy. The Supabase host no
longer resolved, the query failed, and `getDiary` treats "no data" and "query failed" the
same way — so a dead database looked like an empty diary. The rule of the section above
applies: this is a trap worth a mechanism, not a note. `lib/` query functions should
surface Supabase errors so routes answer 500, not 404.

## When this is worth it

Setting this up costs roughly ninety minutes. Against six remaining tasks, doing them by
hand is faster. The break-even is *number of tasks × how often they repeat* — not how
appealing automation sounds.

The E2E suite is worth having either way: it is the only check that fails when the product
is broken.
