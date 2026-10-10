#!/usr/bin/env bash
# Tests for block-risky-commands.sh.
# Run: bash .claude/hooks/block-risky-commands.test.sh
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/block-risky-commands.sh"
fail=0

# check <desc> <command-json> <expected-exit>
check() {
  printf '%s' "$2" | "$HOOK" >/dev/null 2>&1
  local rc=$?
  if [ "$rc" != "$3" ]; then
    echo "FAIL: $1 (got exit $rc, want $3)"
    fail=1
  else
    echo "ok:   $1"
  fi
}

# Deploys are blocked (exit 2)
check "vercel deploy blocks"                 '{"tool_input":{"command":"vercel deploy"}}'                 2
check "vercel --prod blocks"                 '{"tool_input":{"command":"vercel --prod"}}'                 2
check "npx vercel deploy blocks"             '{"tool_input":{"command":"npx vercel deploy"}}'             2
check "deploy after && blocks"               '{"tool_input":{"command":"pnpm build && vercel --prod"}}'   2

# Force-pushes are blocked
check "git push --force blocks"              '{"tool_input":{"command":"git push --force origin main"}}'  2
check "git push -f blocks"                   '{"tool_input":{"command":"git push -f origin x"}}'          2
check "git push --force-with-lease blocks"   '{"tool_input":{"command":"git push --force-with-lease"}}'   2

# Printing env files is blocked
check "cat .env.local blocks"                '{"tool_input":{"command":"cat .env.local"}}'                2
check "head .env blocks"                     '{"tool_input":{"command":"head -5 .env"}}'                  2

# Ordinary commands are allowed (exit 0)
check "git push allows"                      '{"tool_input":{"command":"git push -u origin feat/x"}}'     0
check "vercel env ls allows"                 '{"tool_input":{"command":"vercel env ls"}}'                 0
check "echo \"vercel deploy\" allows"        '{"tool_input":{"command":"echo \"vercel deploy\""}}'        0
check "node --env-file allows"               '{"tool_input":{"command":"node --env-file=.env.local x.mjs"}}' 0
check "cat README allows"                    '{"tool_input":{"command":"cat README.md"}}'                 0
check "empty input allows"                   '{}'                                                         0

if [ "$fail" -eq 0 ]; then
  echo "All hook tests passed."
fi
exit $fail
