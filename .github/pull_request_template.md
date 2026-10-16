Closes #

## What changed


## How it was verified

- [ ] `pnpm verify` passes locally (CI does not run E2E yet)
- [ ] The issue's *Done when* check passes
- [ ] If a hook changed: its `.test.sh` changed too, and all hook suites pass

## Human review

<!--
Machines already check types, lint, tests, E2E and the bundle. A reviewer checks only
what they cannot, and should not have to read every line to do it.

Author (or the agent that opened this): for each item, either point to where it applies
(file:line, or one sentence) or write "N/A — <why>". Never delete an item. Then list the
few files a reviewer must read. Reviewer: tick each item once you have checked it.
-->

**Read these first** (at most 3 files; everything else is covered by the checks above):

1.

- [ ] **Behavior** — every user-visible change matches a decision in the issue, and none
      is new. →
- [ ] **The test proves the goal** — the spec named in *Done when* checks what the issue
      asked for, not just that a page renders. →
- [ ] **Data scope** — every new or changed query filters by the signed-in user's
      `user_id`. The service role bypasses RLS, so nothing else will. →
- [ ] **Input and auth** — new API input is validated and the session is checked. If yes,
      `/security-review` was run. →
- [ ] **Spend** — new model calls go through the daily cap. →
- [ ] **Copy** — Korean UI strings and a11y labels read naturally, in the product's tone. →
- [ ] **Production** — anything that wrote to the production database or deployed had the
      owner's OK, recorded here. →
- [ ] **Migration** — numbered, with an apply plan; applying is a separate step. →
- [ ] **Size** — under ~400 changed lines, or a reason it could not be split. →

## Agent loop

- [ ] This pull request was opened by an agent loop — run by: @
      (approver must be someone else; see CONTRIBUTING.md — in the *Solo phase*, the
      owner ticks the Human review checklist instead)

## Harness

- [ ] This changes the harness (`CLAUDE.md`, `CONTRIBUTING.md`, `docs/HARNESS.md`,
      `.claude/`) — needs **two** approvals before merge
