#!/usr/bin/env bash
# Tests for require-worktree.sh, against a throwaway repo with one linked worktree, so it
# runs the same locally and in CI regardless of where it is invoked from.
# Run: bash .claude/hooks/require-worktree.test.sh
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/require-worktree.sh"
fail=0

# realpath: macOS's mktemp hands out /var/..., which git reports as /private/var/...
tmp=$(cd "$(mktemp -d)" && pwd -P)
trap 'rm -rf "$tmp"' EXIT
main="$tmp/repo"
wt="$main/.claude/worktrees/w"
git init -q "$main"
git -C "$main" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
git -C "$main" worktree add -q "$wt" -b feat/w
outside="$tmp/outside"
mkdir -p "$outside"
# The tests must not inherit a person's escape hatch.
unset CLAUDE_ALLOW_MAIN_CHECKOUT

# check <desc> <json> <expected-exit> [env assignment]
check() {
  printf '%s' "$2" | env ${4:-} "$HOOK" >/dev/null 2>&1
  local rc=$?
  if [ "$rc" != "$3" ]; then
    echo "FAIL: $1 (got exit $rc, want $3)"
    fail=1
  else
    echo "ok:   $1"
  fi
}

edit() { printf '{"tool_name":"%s","cwd":"%s","tool_input":{"file_path":"%s"}}' "$1" "$2" "$3"; }
bash_in() { printf '{"tool_name":"Bash","cwd":"%s","tool_input":{"command":"%s"}}' "$1" "$2"; }

# Main checkout: edits and branch/history changes are blocked
check "main: Edit blocks"                 "$(edit Edit "$main" "$main/src/a.ts")"             2
check "main: Write into a new dir blocks" "$(edit Write "$main" "$main/new/dir/b.ts")"        2
check "main: relative path blocks"        "$(edit Edit "$main" "src/a.ts")"                   2
check "main: git checkout -b blocks"      "$(bash_in "$main" "git checkout -b feat/x")"       2
check "main: git switch blocks"           "$(bash_in "$main" "git switch feat/x")"            2
check "main: add && commit blocks"        "$(bash_in "$main" "git add . && git commit -m x")" 2
check "main: git stash blocks"            "$(bash_in "$main" "git stash push")"               2

# Main checkout: reads and syncing are allowed
check "main: git status allows"           "$(bash_in "$main" "git status")"                   0
check "main: git pull allows"             "$(bash_in "$main" "git pull")"                     0
check "main: git worktree add allows"     "$(bash_in "$main" "git worktree add x -b y")"      0
check "main: git log --grep allows"       "$(bash_in "$main" "git log --grep=git-commit")"    0
check "main: Read allows"                 '{"tool_name":"Read","tool_input":{"file_path":"/x"}}' 0

# Worktree: everything allowed
check "worktree: Edit allows"             "$(edit Edit "$wt" "$wt/src/a.ts")"                 0
check "worktree: git commit allows"       "$(bash_in "$wt" "git commit -m x")"                0
check "worktree: git checkout allows"     "$(bash_in "$wt" "git checkout -b z")"              0

# Outside any repo (scratchpad, memory): allowed
check "outside: Write allows"             "$(edit Write "$main" "$outside/notes.md")"         0

# Escape hatch
check "main: escape hatch allows Edit"    "$(edit Edit "$main" "$main/src/a.ts")"             0 CLAUDE_ALLOW_MAIN_CHECKOUT=1

if [ "$fail" -eq 0 ]; then
  echo "All hook tests passed."
fi
exit $fail
