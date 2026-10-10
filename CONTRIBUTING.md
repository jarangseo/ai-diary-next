# Contributing

> New here? Start with [`docs/GUIDE.md`](./docs/GUIDE.md) ([English](./docs/GUIDE.en.md)) —
> how the whole system fits together, and what every file is for.

How we work on this repo together. Code conventions live in [`CLAUDE.md`](./CLAUDE.md);
how agent loops are run, and why these rules exist, is in
[`docs/HARNESS.md`](./docs/HARNESS.md).

## Setup

1. `pnpm install` (see the `allowBuilds` gotcha in `CLAUDE.md` if it exits 1).
2. Copy `.env.example` to `.env.local` and fill it with the **development** Supabase
   project's keys — never production's. Ask the database owner for access. If the shared
   project is down, or you want E2E runs no one else can disturb, run your own with
   `supabase start` (see *Shared environments* in `docs/HARNESS.md`).
3. `pnpm dev`. Realtime chat also needs `ai-diary-chat-server` on port 4000.
4. Optional, personal: `.claude/settings.local.json` and `CLAUDE.local.md` for your own
   permissions and preferences. Both are gitignored.

## From task to merge

1. **Every change starts as an issue.** Use the *Agent task* template if a loop will do it;
   any issue otherwise.
2. **Assign yourself before starting.** The assignee is the lock — don't start an issue
   someone else holds, and unassign yourself if you stop.
3. **Branch from `main`** as `type/short-desc` (`feat/…`, `fix/…`, `docs/…`). One issue per
   branch.
4. **Run `pnpm verify` before asking for review.** CI does not run E2E yet, so a green CI
   is not proof the feature works — your local `verify` is.
5. **Open a pull request that closes the issue.** Fill in the template. Keep it small; split
   it if the description needs headings.
6. **One approval from someone else, then merge.** For a pull request an agent loop
   opened, the approver is not the person who ran the loop. Pull requests that change the
   harness — `CLAUDE.md`, `CONTRIBUTING.md`, `docs/HARNESS.md`, `.claude/` — need **two**.

`main` is protected: no direct pushes, no force-pushes, `verify` and `bundle-budget` must
pass.

## Agent loops

- Only on issues labelled **`agent-ready`**: those with a *Done when* a machine can check.
  If you can't write that line, the task is not ready for a loop — do it yourself or split
  it until you can.
- The loop opens a **draft** pull request labelled **`agent`**. Read it before marking it
  ready; you are vouching for it to the reviewer.
- A loop stops after two failed attempts and comments on the issue. Look at why before
  restarting it — retrying the same prompt rarely changes the outcome.
- Loops cost money on your account. Keep to the team's daily budget per person (set as a
  spend limit on your account; the amount is in `docs/HARNESS.md`), and never leave a
  loop running without a stop condition.

## Hooks

Changing a hook in `.claude/hooks/` means changing its `<name>.test.sh` too — what it must
block and what it must let through. A new hook comes with a new suite; CI runs all of them.
Run them locally with:

```bash
for t in .claude/hooks/*.test.sh; do bash "$t" || break; done
```

## Decided by a person, not a loop

Production database writes, deploys, anything that spends money, product copy and tone,
database migrations, and changes to the harness (`CLAUDE.md`, `docs/HARNESS.md`,
`.claude/`). The full list and reasoning are in `docs/HARNESS.md`.

**Migrations:** one migration per pull request, numbered when it merges — rename yours if
someone else's `00N_` landed first. Apply to the development database after merge, and to
production only as a separate, announced step.

## When something goes wrong

If you or your agent hit a trap that cost time — a misleading error, a flaky test, a
config surprise — add it to the Gotchas in `CLAUDE.md` or to `docs/HARNESS.md` in a small
pull request. If it is already written there and still happened, propose a hook, test or
lint rule instead: a note that didn't prevent it the first time won't the second.

## Repository setup (admin, once)

These live in GitHub, not in the repo, so they are listed here to be reproducible.

```bash
# Labels
gh label create agent-ready --color 0E8A16 --description "Has a machine-checkable Done when; a loop may take it"
gh label create agent --color 5319E7 --description "Opened by an agent loop"

# Protect main: required checks, one approving review, code owners, no force-push
gh api -X PUT repos/jarangseo/ai-diary-next/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["verify", "bundle-budget"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Then add the development Supabase keys and `E2E_AUTH_SECRET` as repository secrets so CI
can run E2E (tracked in `docs/HARNESS.md`, *The gap*).

Branch protection counts approvals per branch, not per path, so the second approval on
harness pull requests is a reviewers' rule rather than a GitHub setting.
