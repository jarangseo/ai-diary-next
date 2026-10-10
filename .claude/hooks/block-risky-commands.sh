#!/usr/bin/env bash
# PreToolUse(Bash) hook: block the operations an autonomous loop must never take.
#
# The loop (docs/HARNESS.md) is trusted to write code and run `pnpm verify`. It is not
# trusted to deploy, to rewrite published history, or to read the service-role key —
# each of which is either irreversible or hands out full database access.
#
# This complements CI rather than duplicating it: CI runs after a change exists, and
# these are things that must not happen even once.
#
# Contract: receives the tool call as JSON on stdin (.tool_input.command).
# Exit 0 = allow. Exit 2 = block, with the stderr message shown to Claude.
# Fails OPEN (allow) on any uncertainty — a guard rail, not a hard wall.

input=$(cat)

if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  cmd=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
fi

[ -z "$cmd" ] && exit 0

deny() {
  echo "Blocked: $1" >&2
  echo "This is on the human's side of docs/HARNESS.md. Ask rather than proceeding." >&2
  exit 2
}

# Deploys. Irreversible in the sense that matters: it changes what strangers are using.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)(npx[[:space:]]+)?vercel([[:space:]]+.*)?(deploy|--prod)'; then
  deny "deploying is a human decision, not a step in a task."
fi

# Rewriting published history. Local history is fine to amend; pushing over shared refs
# is not recoverable for anyone who already pulled.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force([[:space:]]|$)|--force-with-lease|[[:space:]]-f([[:space:]]|$))'; then
  deny "force-pushing rewrites history other clones already have."
fi

# Reading the service-role key. Nothing an agent does needs the value: the app, the seed
# script and the tests all load .env.local themselves.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)(cat|less|more|head|tail|bat|open)[[:space:]]+[^;&|]*\.env'; then
  deny "the service-role key in .env.local grants full database access; tools that need it load it themselves."
fi

exit 0
