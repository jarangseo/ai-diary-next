# CLAUDE.md

Guide for getting context quickly in future sessions. For detailed setup see `README.md`; for product direction see `docs/PRODUCT_DIRECTION.md`.

## Project overview

**ai-diary-next** — a **personal AI diary app**: record your day by talking with AI and look back on the flow of your emotions.

> ⚠️ `README.md` is written around the initial "shared diary chat" concept. **The confirmed direction is personal-AI-diary-centric**,
> with multi-user realtime chat kept (infra only) but deferred. On any conflict, `docs/PRODUCT_DIRECTION.md` wins.

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
      [date]/               # per-date detail
      chat/                 # chat room list / [roomId] / join  (deferred area)
    settings/               # settings (not implemented — placeholder)
    login/                  # OAuth login
    api/
      auth/[...nextauth]/   # NextAuth
      diary/                # diary CRUD API
      chat/                 # chat rooms / messages / summarize (AI diary generation) API
  components/               # Gnb (top bar), SplitPanel, Calendar, Chat/*, DiaryList, BackButton, WebVitals
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
Diary { date(YYYY-MM-DD, PK), content, isRecordOnly, emotion?, createdAt, updatedAt }
DiaryEmotion { primary, score, summary, questions? }   // DB columns reserved; analysis not implemented
```

DB tables: `diaries`, `chat_rooms`, `room_members`, `chat_messages` (schema in README).
Diary upsert conflict key: `(user_id, date)`. `saveDiary` updates if a row exists (preserving `created_at`), inserts otherwise.

## Current status

**Working**: write/view diary, OAuth, realtime chat rooms, chat→diary auto summary (`api/chat/summarize`, GPT-4o-mini),
dynamic calendar home (month nav, entry dots, date click → detail/write), warm-tone redesign.

**Incomplete / next (order for completing the personal-diary loop)**:
1. Emotion analysis — `updateDiaryEmotion` in `lib/diary.ts` is commented out; analysis logic + UI missing
2. Settings page — `app/settings/page.tsx` is an empty placeholder
3. (deferred) chat `@ai` mention; DiaryList search/filter/edit buttons removed in redesign

## Environment variables (`.env.local`)

`AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SOCKET_URL`

## Gotchas

- **`pnpm-workspace.yaml`**: must list `@parcel/watcher`, `sharp`, `unrs-resolver` under `onlyBuiltDependencies`,
  otherwise `pnpm dev` fails at the install step with `ERR_PNPM_IGNORED_BUILDS`. CI installs with `--ignore-scripts`
  (the bundle check doesn't need those native builds).
- **Socket.IO server is a separate repo** (`ai-diary-chat-server`, port 4000). Run it separately to test realtime chat.
- On Next.js 16, `src/middleware.ts` emits a deprecation warning (`proxy` migration recommended). Harmless for now.
- Styling is unified on SCSS design tokens (`variables.scss`, `mixins.scss`). New styles should use tokens.
- Measure performance in production (`pnpm build && pnpm start`); dev TTFB is inflated by on-demand compilation. See `docs/PERFORMANCE.md`.

## Development workflow

How to carry out a change (keep each step small and verifiable):

1. **Branch from `main`** — name as `type/short-desc` (e.g. `feat/emotion-analysis`,
   `fix/...`, `perf/...`, `docs/...`). Never commit directly to `main`.
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
   when touching auth, API input, or the service-role DB path. Open a small PR into `main`.

Code-style conventions (English artifacts, `services/`/`lib/` layering, SCSS tokens) are in
**Conventions** below.

## Conventions

- **Repo artifacts (commits, PRs, docs, code comments) are in English.** User-facing UI strings and
  a11y labels stay Korean (the product's language). Conversation with the user is in Korean.
- Keep technical terms and code identifiers in their original form.
- Clients go through the `services/` wrapper rather than calling `fetch` directly.
- Server-side DB access goes through functions in `lib/`.
```
