#!/usr/bin/env bash
# PreToolUse(Bash) hook: block `git commit` while on the `main` branch.
#
# Enforces the workflow rule "never commit directly to main" (CLAUDE.md) as a
# system guard instead of relying on memory. CI can't catch this — by the time CI
# runs the commit already exists — so a local pre-commit hook is the only place to stop it.
#
# Contract: receives the tool call as JSON on stdin (.tool_input.command).
# Exit 0 = allow. Exit 2 = block, with the stderr message shown to Claude.
# Fails OPEN (allow) on any uncertainty — this is a guard rail, not a hard wall.

input=$(cat)

# Extract the bash command. Prefer jq; fall back to a permissive grep so a missing
# jq never blocks legitimate work.
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  cmd=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
fi

# Only care about `git commit` invocations (incl. --amend). Match `git commit` only
# as an actual command — at the start or after a shell separator (; && |) — so strings
# like `echo "git commit"` or `git log --grep="git commit"` don't trigger a false block.
if ! printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)git[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

# Branch is read here; the override is a test-only seam (see block-main-commit.test.sh)
# so the block path can be exercised without actually being on main. Unset in real use.
branch="${_BLOCK_MAIN_COMMIT_TEST_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null)}"

if [ "$branch" = "main" ]; then
  echo "Blocked: don't commit directly to main. Create a branch first, e.g.:" >&2
  echo "  git checkout -b feat/your-change   # type/short-desc" >&2
  echo "(then re-run the commit)" >&2
  exit 2
fi

exit 0
