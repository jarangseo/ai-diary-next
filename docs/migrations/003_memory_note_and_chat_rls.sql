-- 003 — memory notes (#108) and RLS on the chat tables (#100)
--
-- STATUS: APPLIED — development 2026-10-19, then production 2026-10-19 (both by Claude via the
-- dashboard, at the owner's request). See ./README.md for the ledger.
--
-- Two unrelated, small changes in one migration, at the owner's request (2026-10-18), so
-- the databases are touched once:
--   1. `diaries.memory_note` — one line per entry for layered memory (#108).
--   2. Row level security on `chat_rooms`, `room_members`, `chat_messages` — off in
--      production, on in development (found while building development, #97). (#100)
--
-- Tested 2026-10-18 on Postgres 16.4 (PGlite), against a stand-in with production's RLS state:
-- it applies, re-applies as a no-op, adds memory_note as nullable text (an existing row
-- reads null), turns RLS on for all three chat tables, and the rollback restores them.
--
-- Backwards compatible with the code currently deployed: the new column is nullable and
-- unread, and this app reaches every table with the service role, which bypasses RLS.
--
-- ⚠️ Before step 2 on production, check the separate chat server (`ai-diary-chat-server`):
-- if it talks to Supabase with the **anon** key rather than the service role, enabling RLS
-- with no policies will block realtime chat. With the service role (or no Supabase access
-- at all) nothing changes. The chat area is deferred in v2, but do not break it silently.


-- ---------------------------------------------------------------------------
-- Pre-apply checks — run first, on the database you are about to change
-- ---------------------------------------------------------------------------
-- 1. memory_note does not exist yet (expect 0 rows):
--    select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'diaries' and column_name = 'memory_note';
-- 2. RLS today on the chat tables (production: expect f f f; development: t t t):
--    select relname, relrowsecurity from pg_class
--     where relname in ('chat_rooms', 'room_members', 'chat_messages') order by relname;
-- 3. (production only) the chat-server question above is answered.


-- ---------------------------------------------------------------------------
-- Step 1 — memory notes (#108)
-- ---------------------------------------------------------------------------
-- One line saying what happened that day, in the user's language, written by the same
-- model call that analyses the emotion. Null until analysed (existing entries are
-- backfilled by a separate, person-run script). Read only for entries older than the
-- 14-day memory window.
alter table public.diaries
  add column if not exists memory_note text;


-- ---------------------------------------------------------------------------
-- Step 2 — RLS on the chat tables (#100)
-- ---------------------------------------------------------------------------
-- Enabled with no policies, the same stance as 001 and 002: the service role passes,
-- the anon key is denied. Enabling an already-enabled table is a no-op.
alter table public.chat_rooms    enable row level security;
alter table public.room_members  enable row level security;
alter table public.chat_messages enable row level security;


-- ---------------------------------------------------------------------------
-- Verify (after applying)
-- ---------------------------------------------------------------------------
-- select column_name, data_type, is_nullable from information_schema.columns
--  where table_schema = 'public' and table_name = 'diaries' and column_name = 'memory_note';
--   -- expect: memory_note | text | YES
-- select relname, relrowsecurity from pg_class
--  where relname in ('chat_rooms', 'room_members', 'chat_messages') order by relname;
--   -- expect: t t t


-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
-- alter table public.diaries drop column if exists memory_note;
-- Restoring production's previous RLS state (off) — only if the chat server broke:
--   alter table public.chat_rooms    disable row level security;
--   alter table public.room_members  disable row level security;
--   alter table public.chat_messages disable row level security;
