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

There is a single Supabase environment (`main`, PRODUCTION) — no staging copy to
rehearse on. Migrations are written to be backwards compatible with the code already
deployed, so the running app keeps working between the migration and the code change.

## Ledger

| # | Migration | Applied | Env | Verified |
|---|---|---|---|---|
| 001 | [`001_diary_id_and_threads.sql`](./001_diary_id_and_threads.sql) | 2026-08-19 | `main` (production) | ✅ see below |

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
`drop constraint if exists` reported success and the constraint was confirmed present
beforehand, so it was dropped. It gets proven for real by the seed script, which writes
two entries on the same date for the same user — impossible while that constraint stood.

## If this outgrows the ledger

The Supabase CLI (`supabase migration new` / `db push`) keeps migrations in
`supabase/migrations/` and tracks applied state in the database itself. Worth adopting
if schema changes become frequent or a second environment appears; today a numbered
folder plus this table costs less than it saves.
