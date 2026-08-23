-- 001 — multiple entries per day + threads
--
-- STATUS: APPLIED 2026-08-19 to `main` (production). See ./README.md for the ledger.
--
-- Verified against the live database on 2026-08-19, so the guesswork in the first
-- draft is gone:
--   diaries.id                is already `uuid PRIMARY KEY` (diaries_pkey)
--   diaries.user_id           is `text` (OAuth sub, 21 chars) — NOT uuid
--   diaries_user_id_date_key  is `UNIQUE (user_id, date)` — this is what forces one
--                             entry per day, and the only thing that has to go
--   emotion_questions         is `text[]`
--   31 rows / 8 users / 2026-02-01..2026-06-02, zero duplicate (user_id, date) pairs
--
-- Backwards compatible with the code currently deployed: `saveDiary` decides
-- insert-vs-update in application code and never relies on the unique constraint, a
-- nullable column is invisible to `rowToDiary`, and the new tables are unreferenced.
-- The running app therefore keeps working between this migration and the code change.
--
-- ⚠️ This project has a single Supabase environment (`main`, PRODUCTION). There is no
-- staging copy to rehearse on. Nothing below deletes data, but read it before running.


-- ---------------------------------------------------------------------------
-- Step 1 — stop forcing one entry per day
-- ---------------------------------------------------------------------------
-- Drops a constraint, not rows. Identity stays `id`, which is already the PK.
alter table public.diaries
  drop constraint if exists diaries_user_id_date_key;

-- `date` is now an ordinary attribute, and every read path filters by user and orders
-- by date (sidebar groups, calendar dots), so it still needs its own index — the one
-- the unique constraint used to provide for free.
create index if not exists diaries_user_date_idx
  on public.diaries (user_id, date desc, created_at desc);


-- ---------------------------------------------------------------------------
-- Step 2 — titles
-- ---------------------------------------------------------------------------
-- Written by the same AI call that produces the emotion analysis. Nullable: the 31
-- existing rows have none, and record-only entries may never get one.
alter table public.diaries
  add column if not exists title text;


-- ---------------------------------------------------------------------------
-- Step 3 — threads
-- ---------------------------------------------------------------------------
-- One thread per diary entry (kind='diary'), or a standalone thread with no entry
-- (kind='question'), which is why diary_id is nullable.
-- user_id is `text` to match diaries.user_id.
create table if not exists public.threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  diary_id    uuid references public.diaries(id) on delete cascade,
  kind        text not null check (kind in ('diary', 'question')),
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint threads_diary_kind_ck check (
    (kind = 'diary'    and diary_id is not null) or
    (kind = 'question' and diary_id is null)
  )
);

-- Sidebar ordering: most recent activity first, per user.
create index if not exists threads_user_updated_idx
  on public.threads (user_id, updated_at desc);

-- A diary entry has at most one thread.
create unique index if not exists threads_diary_uniq
  on public.threads (diary_id) where diary_id is not null;


-- ---------------------------------------------------------------------------
-- Step 4 — messages
-- ---------------------------------------------------------------------------
-- `tool_results` holds what the emotion cards render from. Keeping it out of
-- `content` means a generative-UI message never has to pretend it is text.
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.threads(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant', 'system')),
  content       text not null default '',
  tool_results  jsonb,
  created_at    timestamptz not null default now()
);

-- The only read pattern: one thread's messages, in order.
create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at);


-- ---------------------------------------------------------------------------
-- Step 5 — RLS on the new tables
-- ---------------------------------------------------------------------------
-- Enabled with no policies: every query the app makes goes through server code using
-- the service role, which bypasses RLS, so this changes nothing for the app — but it
-- denies the anon key by default. That matters because the planned public demo route
-- is the first thing that would read with anon, and "someone else's thread" is the
-- worst possible leak in a diary product. Add explicit policies when that route lands.
alter table public.threads  enable row level security;
alter table public.messages enable row level security;


-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.diaries'::regclass;      -- expect only diaries_pkey
-- select column_name from information_schema.columns
--  where table_name = 'diaries' and column_name = 'title';
-- select relname, relrowsecurity from pg_class
--  where relname in ('diaries', 'threads', 'messages');


-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
-- drop table if exists public.messages;
-- drop table if exists public.threads;
-- alter table public.diaries drop column if exists title;
-- drop index if exists public.diaries_user_date_idx;
-- Restoring one-entry-per-day requires deleting duplicates created in the meantime:
--   alter table public.diaries
--     add constraint diaries_user_id_date_key unique (user_id, date);


-- ---------------------------------------------------------------------------
-- Application changes this forces (src/lib/diary.ts)
-- ---------------------------------------------------------------------------
--   getDiary(userId, date)              -> getDiaryById(userId, id)
--                                          + listDiariesByDate(userId, date)
--   saveDiary(...)                      -> createDiary(...) / updateDiary(id, ...)
--                                          (the "exists? update : insert" branch goes
--                                           away — the caller now knows which it is)
--   deleteDiary(userId, date)           -> deleteDiary(userId, id)
--   updateDiaryEmotion(userId, date, e) -> updateDiaryEmotion(userId, id, e)
--   analyzeAndStoreEmotion(...)         -> same, keyed by id
--
-- Routes: /diary/[date] -> /diary/[id]; /api/diary/[date] -> /api/diary/[id].
-- Keep a date-based *list* endpoint — the calendar and the sidebar filter need it.
