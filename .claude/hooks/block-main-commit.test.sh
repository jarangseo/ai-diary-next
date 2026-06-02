#!/usr/bin/env bash
# Tests for block-main-commit.sh. Branch-independent (uses the _BLOCK_MAIN_COMMIT_TEST_BRANCH
# seam), so it runs the same locally and in CI without checking out main.
# Run: bash .claude/hooks/block-main-commit.test.sh
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/block-main-commit.sh"
fail=0

# check <desc> <branch> <command-json> <expected-exit>
check() {
  printf '%s' "$3" | _BLOCK_MAIN_COMMIT_TEST_BRANCH="$2" "$HOOK" >/dev/null 2>&1
  local rc=$?
  if [ "$rc" != "$4" ]; then
    echo "FAIL: $1 (got exit $rc, want $4)"
    fail=1
  else
    echo "ok:   $1"
  fi
}

# On main: real commits are blocked (exit 2)
check "main: git commit -m blocks"          main    '{"tool_input":{"command":"git commit -m \"x\""}}'            2
check "main: git commit --amend blocks"     main    '{"tool_input":{"command":"git commit --amend"}}'            2
check "main: add && commit blocks"          main    '{"tool_input":{"command":"git add . && git commit -m \"x\""}}' 2

# On main: false positives are allowed (exit 0) — "git commit" only as a string/substring
check "main: echo \"git commit\" allows"     main    '{"tool_input":{"command":"echo \"git commit\""}}'           0
check "main: git log --grep allows"          main    '{"tool_input":{"command":"git log --grep=\"git commit\""}}' 0
check "main: git commit-graph allows"        main    '{"tool_input":{"command":"git commit-graph write"}}'        0
check "main: non-commit (ls) allows"         main    '{"tool_input":{"command":"ls -la"}}'                        0

# On a feature branch: everything is allowed, including real commits
check "feature: git commit -m allows"        feat/x  '{"tool_input":{"command":"git commit -m \"x\""}}'           0

if [ "$fail" -eq 0 ]; then
  echo "All hook tests passed."
fi
exit $fail
