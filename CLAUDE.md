# CLAUDE.md

Guide for getting context quickly in future sessions. For detailed setup see `README.md`; for product direction see `docs/PRODUCT_DIRECTION.md` (v2)
and `docs/PRODUCT_BRIEF.md` (who, metrics, cost, timeline);
for how the team and agent workflow fits together see `docs/GUIDE.en.md`.

## Project overview

**ai-diary-next** — a **personal AI diary app**: talk about your day (or write it) and it becomes a diary; an AI that
remembers past entries; the entries add up to the flow of your emotions.

> The v2 redesign (conversation-first home, memory, new design system) is **designed but not built yet** — see the v2
> section and release plan in `docs/PRODUCT_DIRECTION.md`; designs are linked from `docs/reviews/`. Multi-user realtime
> chat is kept (infra only) but deferred. On any conflict, `docs/PRODUCT_DIRECTION.md` wins.

## Tech stack

| Area | Tech |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Package manager | **pnpm** (pinned via `packageManager: pnpm@11.1.2`) |
| Auth | NextAuth v5 (Google / GitHub OAuth, JWT) |
| DB | Supabase (PostgreSQL) |
| Realtime | Socket.IO (separate server, port 4000) |
| State | React Query (server) + Zustand (UI) |
| AI | OpenAI GPT-4o-mini |
| Styling | CSS Modules + SCSS (design-token based) |
| Testing | Vitest |

## Common commands

```bash
pnpm dev                  # dev server (localhost:3000)
pnpm build                # production build
pnpm start                # serve production build (use this to measure real perf)
pnpm lint                 # ESLint
pnpm test                 # Vitest watch
pnpm test:run             # Vitest single run
pnpm measure:bundle       # shipped gzip JS size (after build)
pnpm check:bundle-budget  # fail if bundle exceeds budget (CI gate)
```

## Directory structure

```
src/
  app/
    diary/                  # main (auth required; layout.tsx renders the Gnb top bar)
      DiaryHome.tsx         # calendar|list toggle + "오늘 쓰기" (client)
      write/                # diary writing
      list/                 # redirect → /diary (superseded by the list toggle)
      [id]/                 # entry detail (+ ThreadPanel: conversation about the entry)
      chat/                 # chat room list / [roomId] / join  (deferred area)
    settings/               # account withdrawal + data notice (v2 settings not built yet)
    login/                  # OAuth login
    api/
      auth/[...nextauth]/   # NextAuth
      diary/                # diary CRUD API (by id) + emotion analysis scheduling
      threads/              # per-entry conversation messages (daily cap: lib/usage.ts)
      account/              # account deletion
      chat/                 # chat rooms / messages / summarize (AI diary generation) API
  components/               # Gnb, SplitPanel, Calendar, Chat/*, DiaryList, Thread, Settings, BackButton, WebVitals
  hooks/useSocket.ts        # Socket.IO connection/events (has tests)
  lib/                      # supabase, diary, chat (server-side queries), date helpers
  services/chatServices.ts  # client fetch wrapper (components never call fetch directly)
  types/                    # diary.ts, chat.ts
  styles/                   # globals / variables / mixins (SCSS design tokens)
```

- Path alias: `@/*` → `src/*`

## Data model (core)

```ts
// types/diary.ts
Diary { id(uuid, PK), date(YYYY-MM-DD), title?, content, isRecordOnly, emotion?, createdAt, updatedAt }
DiaryEmotion { primary, score, summary, questions? }   // analyzed on save and on chat summarize
```

DB tables: `diaries`, `threads`, `messages` (migration 001), and the deferred `chat_rooms`, `room_members`, `chat_messages`.
Entries are identified by `id`; `date` is a filter (a date can hold several entries). `createDiary` always inserts,
`updateDiary(userId, id, …)` edits. Routes: `/diary/[id]`, `/api/diary/[id]` (GET/PATCH/DELETE), `GET /api/diary?date=` lists a day.

## Current status

**Working (v1 app)**: OAuth; write/view/delete entries by id, several per date; calendar home (month nav, entry
dots, date → day list); emotion analysis on save + badge on the detail page; a conversation panel on each entry
(streaming, daily cap of 20 user messages); account withdrawal; chat→diary summary (`api/chat/summarize`);
realtime chat rooms (deferred area).

**Next**: v2, by the release plan in `docs/PRODUCT_DIRECTION.md`. Before v2.0 (see `docs/PRODUCT_BRIEF.md`):
usability test, per-user cost estimate and a re-set daily cap, legal review (sensitive data, overseas transfer,
privacy policy), data-scope hardening and a dev database. Still open from v1: emotion-colored calendar dots
(`docs/EMOTION_ANALYSIS.md`).

## Environment variables (`.env.local`)

`AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SOCKET_URL`

## Gotchas

- **`pnpm-workspace.yaml`**: must approve `@parcel/watcher`, `sharp`, `unrs-resolver` under **`allowBuilds`**,
  otherwise a cold `pnpm install` exits 1 with `ERR_PNPM_IGNORED_BUILDS`. `onlyBuiltDependencies` alone is
  **no longer sufficient** on pnpm 11 — it is still read, but the install fails anyway. CI installs with
  `--ignore-scripts` so it never hit this; Vercel does a plain install, so it broke there first.
- **Never resolve an entry by date.** A date holds any number of entries since migration 001;
  `.single()`/`.maybeSingle()` on `(user_id, date)` errors (PGRST116, 406) once it holds two. Use
  `getDiaryById`, or `listDiariesByDate` for a day. Old `/diary/YYYY-MM-DD` links redirect to the list.
- **Socket.IO server is a separate repo** (`ai-diary-chat-server`, port 4000). Run it separately to test realtime chat.
- On Next.js 16, `src/middleware.ts` emits a deprecation warning (`proxy` migration recommended). Harmless for now.
- Styling is unified on SCSS design tokens (`variables.scss`, `mixins.scss`). New styles should use tokens.
- Measure performance in production (`pnpm build && pnpm start`); dev TTFB is inflated by on-demand compilation. See `docs/PERFORMANCE.md`.

## Development workflow

How to carry out a change (keep each step small and verifiable):

0. **Start from an issue, assigned to you** — the assignee is the lock that keeps two people
   (or two loops) off the same task. Team rules: `CONTRIBUTING.md`; loops: `docs/HARNESS.md`.
1. **Work in a new worktree, branched from `main`** — before the first edit, create one
   (`EnterWorktree`, `claude --worktree <name>`, or `git worktree add .claude/worktrees/<name>
   -b type/short-desc origin/main`). Never edit or switch branches in the main checkout:
   another session may be using it. `require-worktree.sh` blocks it. Name branches
   `type/short-desc` (e.g. `feat/emotion-analysis`, `fix/...`, `perf/...`, `docs/...`).
   Never commit directly to `main`.
2. **Read before you write** — for a new feature, first read the relevant code and explain
   the current structure, then propose a plan. **Do not start with code.**
3. **Plan first for non-trivial work** — agree the design (and any product decisions)
   before writing code, then break the work into stages. See the bundle-by-bundle pattern
   in `docs/PERFORMANCE.md`.
4. **Test core logic, then self-verify** — after implementing core logic, write/run tests
   to prove it yourself; don't rely on the reader to spot-check.
5. **Verify at the end of each stage** — `pnpm typecheck` + `pnpm test:run` (+ `pnpm lint`)
   must pass before committing. If the change can affect shipped JS, also
   `pnpm check:bundle-budget` (CI fails if gzip JS > 250 KB).
6. **Commit in small stages** — one logical step per commit, English message. Prefer several
   small commits over one large one (smaller PRs = easier review + regression bisection).
   Format `type(scope): subject`, present tense, lowercase subject; types in use:
   `feat fix perf refactor style test docs ci chore`. End AI-authored commits with the
   `Co-Authored-By: Claude ...` footer.
7. **Review before merge** — run `/code-review` for correctness/cleanup; `/security-review`
   when touching auth, API input, or the service-role DB path. Open a small PR into `main`;
   it needs an approval from someone else (for a loop's PR, not the person who ran it).
   While the repo is in the *Solo phase* (`CONTRIBUTING.md`), the owner merges after
   ticking the checklist.
   **Fill in the template's *Human review* checklist**: point each item at where it
   applies or mark it `N/A — <why>`, and name at most three files the reviewer must read.

Code-style conventions (English artifacts, `services/`/`lib/` layering, SCSS tokens) are in
**Conventions** below.

## Conventions

- **Repo artifacts (commits, PRs, docs, code comments) are in English.** User-facing UI strings and
  a11y labels stay Korean (the product's language). Conversation with the user is in Korean.
- Keep technical terms and code identifiers in their original form.
- Clients go through the `services/` wrapper rather than calling `fetch` directly.
- Server-side DB access goes through functions in `lib/`.
- Personal preferences go in `CLAUDE.local.md` (gitignored), not here — this file is shared
  by every teammate's agent and changes by pull request.
```
