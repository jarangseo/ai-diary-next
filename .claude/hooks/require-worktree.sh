#!/usr/bin/env bash
# PreToolUse(Edit|Write|NotebookEdit|Bash) hook: changes happen in a worktree, never in the
# main checkout.
#
# Two sessions shared the main checkout once: one switched its branch and committed, the
# other then branched from that state without noticing, and its pull request carried the
# first session's commit. Nothing failed — that is the problem. A note in CLAUDE.md would
# not have stopped it (CONTRIBUTING.md: "a note that didn't prevent it the first time
# won't the second"), so this blocks it instead.
#
# Blocks, when the target is the main checkout (not a linked worktree):
#   - Edit / Write / NotebookEdit of a file inside it
#   - git commands that move HEAD or rewrite the tree: checkout, switch, commit, merge,
#     rebase, reset, cherry-pick, revert, stash
# Allows everything else, including reads, `git pull` to sync main, and `git worktree add`.
# Shell writes (sed -i, redirects) are not caught — the git guard catches them at commit.
#
# Escape hatch for a person working alone on purpose: CLAUDE_ALLOW_MAIN_CHECKOUT=1.
#
# Contract: tool call JSON on stdin. Exit 0 = allow. Exit 2 = block (stderr shown to Claude).
# Fails OPEN (allow) on any uncertainty — no jq, not a git repo, unknown tool.

[ "${CLAUDE_ALLOW_MAIN_CHECKOUT:-}" = "1" ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$cwd" ] && cwd=$PWD

# Is <dir> inside the main checkout (as opposed to a linked worktree or outside any repo)?
# The main checkout is the one whose git dir is the common dir.
in_main_checkout() {
  local dir=$1 git_dir common_dir
  git_dir=$(git -C "$dir" rev-parse --path-format=absolute --git-dir 2>/dev/null) || return 1
  common_dir=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
  [ "$git_dir" = "$common_dir" ]
}

block() {
  echo "Blocked: $1 in the main checkout. Every session works in its own worktree" >&2
  echo "(docs/HARNESS.md, \"One session, one worktree\"). Create one first:" >&2
  echo "  EnterWorktree tool (Claude Code), or: claude --worktree <name>" >&2
  echo "  or: git worktree add .claude/worktrees/<name> -b type/short-desc origin/main" >&2
  exit 2
}

case "$tool" in
  Edit | Write | NotebookEdit)
    file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
    [ -z "$file" ] && exit 0
    case "$file" in /*) ;; *) file="$cwd/$file" ;; esac
    # The file may not exist yet (Write); walk up to the nearest existing directory.
    dir=$(dirname "$file")
    while [ ! -d "$dir" ] && [ "$dir" != "/" ]; do dir=$(dirname "$dir"); done
    in_main_checkout "$dir" && block "editing $(basename "$file")"
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
    # Only as an actual command — at the start or after a separator — so strings such as
    # `git log --grep="git commit"` don't match. `-C <path>` retargets the command, which
    # this does not follow; it fails open there.
    if printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)git[[:space:]]+(checkout|switch|commit|merge|rebase|reset|cherry-pick|revert|stash)([[:space:]]|$)'; then
      in_main_checkout "$cwd" && block "changing branches or history"
    fi
    ;;
esac

exit 0
