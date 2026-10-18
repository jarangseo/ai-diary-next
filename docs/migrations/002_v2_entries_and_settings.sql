-- 002 — v2 entries (chat / write, AI draft, owned emotion) and per-user settings
--
-- STATUS: APPLIED 2026-10-18 to `main` (production) by the owner. See ./README.md for the ledger.
--
-- Sources: docs/PRODUCT_DIRECTION.md (v2 *Decision records*, *Screen specs (v2.0)*,
-- *Beyond Korea*, *Schema implications (v2)*) and the screen canvas specs of 2026-10-18.
--
-- Pre-apply checks run against the live database (`main`, production) by the owner on
-- 2026-10-18, all as expected:
--   1. new columns           → no rows (none exists yet)
--   2. user_settings         → NULL (table does not exist)
--   3. CHECKs on diaries     → no rows (no CHECK at all, so an empty `content` is accepted)
--
-- Tested on 2026-10-18 against Postgres 16.4 (PGlite), on a stand-in for the post-001 schema
-- built from src/lib/supabase.ts. It applies, re-applies as a no-op, and backfills an
-- existing row as write/ai. A deployed-style insert still works, and a chat entry with an
-- empty body works. All three CHECKs reject what they should. user_settings gets its
-- defaults and RLS. Asia/Seoul midnight can be computed in SQL from a stored zone, and the
-- rollback restores the 001 shape. A stand-in is not the live schema, which is why the
-- pre-apply checks above were run on the live database.
--
-- Backwards compatible with the code currently deployed:
--   - every new `diaries` column is nullable or has a default, and the deployed inserts name
--     none of them, so they keep working (new rows get mode = 'write', emotion_source = 'ai');
--   - `threads.crisis_at` is nullable and unread by deployed code;
--   - `user_settings` is a new table nothing reads yet. Until a user has a row, code falls
--     back to today's behaviour (memory on, UTC, Korean).
--
-- ⚠️ Single Supabase environment (`main`, PRODUCTION). Nothing below deletes data.


-- ---------------------------------------------------------------------------
-- Pre-apply checks — run 2026-10-18, results in the header
-- ---------------------------------------------------------------------------
-- 1. None of the new columns exists yet (expect 0 rows):
--    select table_name, column_name from information_schema.columns
--     where table_schema = 'public'
--       and ((table_name = 'diaries' and column_name in
--              ('mode','summary','summary_made_at','summary_edited_at',
--               'emotion_secondary','emotion_source'))
--         or (table_name = 'threads' and column_name = 'crisis_at'));
-- 2. `user_settings` does not exist (expect null):
--    select to_regclass('public.user_settings');
-- 3. A chat entry is created with an empty body, so `content` must accept '' (it is text; a
--    NOT NULL there is fine). Check there is no CHECK forbidding an empty string:
--    select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.diaries'::regclass and contype = 'c';


-- ---------------------------------------------------------------------------
-- Step 1 — how an entry was written
-- ---------------------------------------------------------------------------
-- 'chat'  = 대화로 쓰기: the 일기 is the AI draft in `summary`; `content` stays '' (the user's
--           words live in the conversation).
-- 'write' = 직접 쓰기: the 일기 is `content` (내 글); `summary` stays null.
-- Every existing row was written in the body, so the default backfills them as 'write'. The
-- default also stays, so the deployed code's inserts keep producing valid rows.
alter table public.diaries
  add column if not exists mode text not null default 'write';

do $$ begin
  alter table public.diaries
    add constraint diaries_mode_ck check (mode in ('chat', 'write'));
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- Step 2 — the AI draft of a chat entry
-- ---------------------------------------------------------------------------
-- summary            the 일기 text, which the user may edit (`다듬기`)
-- summary_made_at    when the draft was made. The draft is outdated ("정리한 뒤에 나눈 대화가
--                    있어요 · 다시 정리") when the entry's thread has a message after it, and
--                    "대화 N개를 정리했어요" counts messages up to it, so neither needs a column
-- summary_edited_at  set when the user edits the draft; `다시 정리` warns while it is set
alter table public.diaries
  add column if not exists summary text,
  add column if not exists summary_made_at timestamptz,
  add column if not exists summary_edited_at timestamptz;

-- Only chat entries have a draft: a written entry's 일기 is 내 글, never a second summary.
do $$ begin
  alter table public.diaries
    add constraint diaries_summary_chat_only_ck check (mode = 'chat' or summary is null);
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- Step 3 — emotion: a second one, and who chose it
-- ---------------------------------------------------------------------------
-- Keys are the language-neutral taxonomy in src/lib/emotion.ts (`tired`, not `지침`),
-- validated in the app like `emotion_primary` is today.
-- emotion_source 'user' means the user picked it; re-analysis must not overwrite it.
alter table public.diaries
  add column if not exists emotion_secondary text,
  add column if not exists emotion_source text not null default 'ai';

do $$ begin
  alter table public.diaries
    add constraint diaries_emotion_source_ck check (emotion_source in ('ai', 'user'));
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- Step 4 — a crisis signal, per conversation
-- ---------------------------------------------------------------------------
-- Set when a crisis signal is detected. While set, the AI does not offer wrap-up in this
-- conversation (spec 1-1 / 5-2). Kept on the thread, not the message, because the rule is
-- about the conversation from then on.
alter table public.threads
  add column if not exists crisis_at timestamptz;


-- ---------------------------------------------------------------------------
-- Step 5 — per-user settings
-- ---------------------------------------------------------------------------
-- The app has no users table: `user_id` is the OAuth subject (text, as in 001).
-- A row is created on the user's first v2 visit, with the browser's time zone and locale.
-- No backfill: a missing row means defaults, and the browser knows the real zone better
-- than a guess made here would.
--
-- timezone  IANA name (`Asia/Seoul`). Postgres cannot check it in a CHECK (pg_timezone_names
--           is a view), so the app validates it with Intl before writing. Stored rather than
--           sent per request, so the daily limit cannot be reset by switching zones (#59).
-- locale    BCP 47 tag (`ko`, `en-US`). Korean is the only UI language in v2.0.
create table if not exists public.user_settings (
  user_id         text primary key,
  memory_enabled  boolean not null default true,
  timezone        text not null default 'UTC',
  locale          text not null default 'ko',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Same stance as 001's new tables: every query goes through the service role, which bypasses
-- RLS; enabling it with no policies denies the anon key by default.
alter table public.user_settings enable row level security;


-- ---------------------------------------------------------------------------
-- Verify (after applying)
-- ---------------------------------------------------------------------------
-- select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_schema = 'public' and table_name in ('diaries', 'threads', 'user_settings')
--  order by table_name, ordinal_position;
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conname in ('diaries_mode_ck', 'diaries_summary_chat_only_ck', 'diaries_emotion_source_ck');
-- select mode, count(*) from public.diaries group by mode;     -- expect only 'write'
-- select relname, relrowsecurity from pg_class where relname = 'user_settings';  -- expect t


-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
-- drop table if exists public.user_settings;
-- alter table public.threads drop column if exists crisis_at;
-- alter table public.diaries
--   drop constraint if exists diaries_emotion_source_ck,
--   drop constraint if exists diaries_summary_chat_only_ck,
--   drop constraint if exists diaries_mode_ck,
--   drop column if exists emotion_source,
--   drop column if exists emotion_secondary,
--   drop column if exists summary_edited_at,
--   drop column if exists summary_made_at,
--   drop column if exists summary,
--   drop column if exists mode;
-- Rolling back after v2 code writes chat entries loses their drafts. Export first.


-- ---------------------------------------------------------------------------
-- Not in this migration, on purpose
-- ---------------------------------------------------------------------------
-- - The theme and the last-used writing tab: saved per device (decided 2026-10-18), no column.
-- - The wrap-up offer and its decline: they are conversation events, stored as assistant
--   messages with `tool_results` (`messages.tool_results`, from 001), so "4 more messages
--   since the decline" is counted from the messages themselves.
-- - `is_record_only`: unused by v2, but deployed code still writes it. Drop it in a later
--   migration once nothing does.


-- ---------------------------------------------------------------------------
-- Application changes this enables (each its own issue)
-- ---------------------------------------------------------------------------
--   src/lib/supabase.ts         DiaryRow / ThreadRow gain the new columns; UserSettingsRow
--   src/lib/diaryMapper.ts      map mode, summary(+made/edited), emotion secondary/source
--   src/lib/diary.ts            createDiary takes a mode; chat entries start with content '';
--                               re-analysis skips the emotion when emotion_source = 'user'
--   src/lib/settings.ts (new)   get-or-create user settings; validate timezone with Intl
--   src/lib/threads.ts          countUserMessagesToday counts from the user's midnight (#59)
--   src/lib/diary.ts            deleteAllUserData also deletes the user's user_settings row
