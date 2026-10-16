# Product brief

> Created 2026-10-17 · Status: **draft — every line marked _Proposed_ needs the owner's sign-off**
>
> One page for a decision-maker who has five minutes. The *how* lives in
> [`PRODUCT_DIRECTION.md`](./PRODUCT_DIRECTION.md) (v2) and the design artifacts; this page is the
> *who, why, how we know, what it costs, and when*.

## In one sentence

**Talk about your day and it becomes a diary; the diaries pile up into the flow of your emotions; and
everything you wrote stays yours.**
UI tagline (Korean): *말하듯 쓰면 일기가 되고, 쌓이면 내 마음의 흐름이 돼요.*

## Who it is for — _Proposed_

| | |
|---|---|
| **Primary** | Office workers in Korea, 25–35, who want to keep a diary but stop after a few days. They write at night, on a phone, tired. A blank page is the obstacle; talking is not. |
| **Secondary** | People who want to notice their moods over weeks (not a clinical audience — the product is never therapy). |
| **Not for** | Shared or group diaries (v0 idea, deferred); people seeking mental-health treatment (we point them to professionals). |

## Why us, not ChatGPT — _Proposed_

"An AI that remembers" alone is not enough: general assistants now remember too, and AI-journaling and
mood-tracking apps already exist. We win on the **combination**:

1. **A conversation becomes a diary.** The AI asks, then drafts the entry in the user's own words; the
   user owns and edits it. A general assistant leaves you with a chat log, not a diary.
2. **Entries become a flow.** Each entry carries an emotion the user can correct; the sidebar, calendar
   and month line turn them into a visible history. Mood trackers have the flow but no writing.
3. **Your data is yours.** Plain disclosure of what the AI reads, memory you can switch off, export,
   full deletion.

## How we know it works — _Proposed_

| Metric | Definition | Why |
|---|---|---|
| **North star** | Weekly users who **complete ≥3 entries** (a chat wrapped up into a 일기, or a saved 내 글) | Habit is the product; one entry a week is a trial, three is a diary |
| Wrap-up rate | Chats wrapped up ÷ chats started | Does talking actually produce a diary? |
| Day-7 return | Users who complete an entry again within 7 days of their first | First-week habit |
| Memory engagement | Source-chip opens ÷ replies that used memory | Is the differentiator noticed? |
| Mode mix | Share of entries by `대화로 쓰기` / `직접 쓰기` | Settles the default-tab question |

**Gap:** the codebase has no analytics today, so none of these can be measured. Event capture
(privacy-respecting: counts and states, never entry text) is part of v2.0.

## What it costs and how it pays — _Proposed_

- **Cost driver:** model calls. Per active user per day ≈ turns × (conversation + memory context
  tokens) + one analysis call per entry. Memory multiplies input tokens, so entries get a stored short
  condensation that is reused as context. A per-user monthly cost estimate needs the provider's current
  price sheet and is the next step before launch.
- **Guardrail today:** `DAILY_MESSAGE_LIMIT = 20` (`src/lib/usage.ts`), shared with analysis. One chat
  entry takes 6–10 turns, so two entries a day hit the cap — **the cap must be re-set from the cost
  estimate** before v2.0.
- **Revenue hypothesis:** free tier with the daily cap and two-week memory; a paid tier for full-archive
  memory, a monthly reflection and a higher cap. Export and deletion stay free (trust is the product).
  Price is a hypothesis to test in the beta, not a decision.

## When — _Proposed_

Assumes one person working full time (the repo is in its solo phase).

| Release | Contents (detail in PRODUCT_DIRECTION) | Effort | Target |
|---|---|---|---|
| Prep | Usability test (5 people), cost estimate, legal review started, data-scope hardening, dev DB | 2 wks | 2026-10-30 |
| **v2.0** closed beta | New design system and shell, 대화로 쓰기 + wrap-up, memory greeting and source chips, emotion correction, first run / failure / limit states, privacy notice, crisis protocol, event capture | 7 wks | 2026-12-18 |
| v2.1 | 직접 쓰기, question chips, 일기에 덧붙이기 | 3 wks | 2027-01-15 |
| v2.2 | Calendar with month line, list edit, export, 1년 전 오늘 | 3 wks | 2027-02-05 |
| v2.3 | Full-archive memory, app lock | 4 wks | 2027-03-05 |

## Top risks

| Risk | Mitigation |
|---|---|
| **Sensitive data handled by the service role** — one missing `user_id` filter exposes another user's diary | Scope every query in `lib/`, test it, add RLS as a second wall, separate dev DB — before v2.0 |
| **Legal**: diaries hold health information; text goes to an overseas AI provider; no privacy policy or terms pages | Legal review of consent and overseas-transfer requirements; publish policy and terms before the beta |
| **Crisis conversations** | Crisis protocol with Korean crisis lines; a written detection standard and test set |
| **Differentiation erodes** as general assistants add memory | Lead with conversation-to-diary and the emotion flow, not memory alone |
| **Mobile web cannot send reminders** (iOS: installed PWAs only) | Decide PWA vs native before v2.0 |

## Decisions needed from the owner

1. Confirm the target user and the one-sentence positioning.
2. Confirm the north-star metric and approve event capture in v2.0.
3. Choose: free personal project, or freemium with a paid tier.
4. Approve the timeline assumption (full time, solo) or give the real weekly hours.
5. PWA or native for reminders.
