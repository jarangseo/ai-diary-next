-- Emotion analysis columns on `diaries`.
--
-- Run in the Supabase SQL editor. There is no migration runner in this repo yet,
-- so this file documents the required schema and is applied manually.
--
-- Context: the emotion_* columns were "reserved" but emotion_score was created with
-- too small a numeric precision/scale, so storing the 0–100 intensity score failed
-- with "numeric field overflow" — analysis ran but the value was never persisted.
-- emotion_score must be an integer in [0, 100].

alter table diaries
  add column if not exists emotion_primary   text,
  add column if not exists emotion_score      integer,
  add column if not exists emotion_summary    text,
  add column if not exists emotion_questions  text[];

-- Fix an existing emotion_score that was created as numeric(small) → integer.
-- (No-op if it is already integer. Current rows are null, so the cast is lossless.)
alter table diaries
  alter column emotion_score type integer using emotion_score::integer;

-- Optional guard: keep the score within the documented 0–100 range.
alter table diaries
  drop constraint if exists diaries_emotion_score_range,
  add  constraint diaries_emotion_score_range
       check (emotion_score is null or (emotion_score between 0 and 100));
