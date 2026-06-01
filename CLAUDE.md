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

## Conventions

- **Repo artifacts (commits, PRs, docs, code comments) are in English.** User-facing UI strings and
  a11y labels stay Korean (the product's language). Conversation with the user is in Korean.
- Keep technical terms and code identifiers in their original form.
- Clients go through the `services/` wrapper rather than calling `fetch` directly.
- Server-side DB access goes through functions in `lib/`.
```
