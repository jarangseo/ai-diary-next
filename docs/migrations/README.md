# Migrations

Schema changes are hand-written SQL, applied through the Supabase SQL Editor. This repo
has no migration runner — the ledger below **is** the record of what has been applied.

## Convention

- One numbered file per change: `NNN_short_name.sql`.
- Every statement guarded (`if exists` / `if not exists`) so re-running is a no-op.
- Paste the whole file at once. Postgres DDL is transactional, so a failure anywhere
  rolls the entire migration back rather than leaving a half-applied schema.
- The file states what was **verified against the live database** before it was written,
  so a reader can tell facts from assumptions.
- After applying, add a row to the ledger and record how it was verified.
- **Apply to development first, then production.** CI's E2E runs against
  `ai-diary-next-dev`, so a migration that reaches production but not development leaves
  CI testing a schema that no longer exists.
- **Code that uses a new column merges only after production has it.** `main` deploys to
  production, and CI cannot catch the gap: its E2E runs on development, which already has
  the column. So the order is migration on development → migration on production → merge
  the code that reads or writes it. Keep such a PR a **draft** until then, and say so at the
  top of its body. (2026-10-18: #116 would have broken every emotion-analysis save on
  production, because `memory_note` did not exist there yet. A local run against production
  logged `Could not find the 'memory_note' column`.)

There are two Supabase projects (since 2026-10-18, #97):

| Project | Role |
|---|---|
| `jarangseo's Project` | **production** — the live app |
| `ai-diary-next-dev` | development — CI's E2E, and the place to rehearse a migration |

`ai-diary-next-dev` was built from production's original creation queries plus 001 and
002, and checked equal to production on 2026-10-18 (same column and constraint
fingerprints; issue #97). One known difference: RLS is on for the three chat tables in
development but off in production.

Migrations are written to be backwards compatible with the code already deployed, so the
running app keeps working between the migration and the code change.

## Ledger

| # | Migration | Applied | Env | Verified |
|---|---|---|---|---|
| 001 | [`001_diary_id_and_threads.sql`](./001_diary_id_and_threads.sql) | 2026-08-19 | `main` (production) | ✅ see below |
| 002 | [`002_v2_entries_and_settings.sql`](./002_v2_entries_and_settings.sql) | 2026-10-18 | `main` (production) | ✅ see below |
| 003 | [`003_memory_note_and_chat_rls.sql`](./003_memory_note_and_chat_rls.sql) | 2026-10-19 | development, then `main` (production) | ✅ see below |

### 003 — verification

- Before: tested on Postgres 16.4 (PGlite) against a stand-in with production's RLS state
  (7/7). The separate chat server was checked first: it connects with
  `SUPABASE_SERVICE_ROLE_KEY` (`ai-diary-chat-server/src/supabase.ts`), so RLS does not block it.
- Development: applied, then verified `memory_note` = text/nullable and RLS true on all three
  chat tables.
- Production: pre-apply check returned `memory_note` absent and RLS **false** on all three
  chat tables. After applying: `memory_note` = text/nullable, RLS true on all three, and
  still 34 entries.
- With this applied, the code that uses `memory_note` (#116) could merge, per the rule above.

The two SQL Editor queries used for this ("Untitled query") can be deleted from the
dashboard; the saved creation queries were not touched.

### 002 — verification

- Before: tested on Postgres 16.4 (PGlite) against a stand-in schema (14/14 checks, listed in
  the file header). The three pre-apply checks on `main` returned what the draft expects.
- Applied by the owner in the SQL Editor, statements only (the file without comments):
  `Success. No rows returned`.
- After:
  - `select mode, count(*) from diaries group by mode` → `write | 34`. Every existing entry
    was backfilled, with no other mode.
  - `user_settings` has `relrowsecurity = true`.

### 001 — verification

Run in the SQL Editor: `Success. No rows returned`.

Independently checked afterwards against the live PostgREST schema:

- `threads` and `messages` exist, with the expected primary keys and the
  `diary_id → diaries.id` / `thread_id → threads.id` foreign keys
- `messages.tool_results` is `jsonb`
- `diaries.title` exists
- both new tables are readable with the service role (RLS enabled, no policies, so the
  service role passes and the anon key does not)

Not directly observable through PostgREST: that `diaries_user_id_date_key` is gone.
**Proven by the seed** on the same day — it wrote 60 entries across 55 dates, five of
them carrying two entries for one user (2026-08-15..19). That insert would have failed
outright while the constraint stood. The 11 pre-existing entries were untouched.

## If this outgrows the ledger

The Supabase CLI (`supabase migration new` / `db push`) keeps migrations in
`supabase/migrations/` and tracks applied state in the database itself. Worth adopting
if schema changes become frequent or a second environment appears; today a numbered
folder plus this table costs less than it saves.
