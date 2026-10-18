# Cost and latency of v2 — estimate

> Created 2026-10-18 · CTO review item 2 · Status: **estimate**, to be replaced by measurements
> (see *What to measure*). Feeds `PRODUCT_BRIEF.md` (cost, daily cap) and the v2.0 build.

## Bottom line

- **Model cost is small.** With `gpt-4o-mini` and memory switched on, one chat entry (8 turns, wrap-up,
  analysis) costs about **$0.003**. A habitual user (3 entries a week) costs about **$0.04 a month**; a
  heavy user (2 entries a day) about **$0.16 a month**.
- **The daily cap of 20 messages is set far below what cost requires** and collides with the product: one
  chat entry takes 6–10 user messages. The cap is an abuse guard, and should be sized as one.
- **The real cost risk is unbounded input, not normal use.** A user message has no length limit today, so
  pasted text multiplies through the 20-message history on every later turn.
- **Latency risk is the greeting, not the conversation.** Adding ~1k tokens of memory to each turn barely
  moves time-to-first-token; generating a remembering greeting *on page load* would put a model call in
  front of the home screen.

## Inputs

| Input | Value | Source |
|---|---|---|
| Model | `gpt-4o-mini` (chat, analysis, summarize) | `src/lib/modelStream.ts`, `emotionAnalysis.ts`, `api/chat/summarize` |
| Price per 1M tokens | input **$0.15**, cached input **$0.075**, output **$0.60** | OpenAI API pricing page, read 2026-10-18 (Standard tier) |
| Korean text | **≈ 0.6 tokens per character** (0.57–0.64 on five samples) | Measured with `tiktoken` `o200k_base` on the app's system prompt and sample entries |
| History sent per turn | last 20 messages (`MAX_HISTORY`) | `src/lib/modelStream.ts` |
| Daily cap | 20 user messages, shared with analysis | `src/lib/usage.ts`, `api/diary/scheduleAnalysis.ts` |
| User message length limit | **none** | `api/threads/[threadId]/messages/route.ts` |

Measured sizes: system prompt 124 tokens; a typical user line ~25–50 tokens; an AI reply ~40–50 tokens; a
140–210-character entry ~90–120 tokens.

## Per chat entry (v2, memory on)

Assumptions: 8 turns; user 50 and AI 50 tokens per turn; v2 system prompt ~250 tokens; memory context
~1,000 tokens (two weeks of entries, each condensed to ~60 tokens — see *Design consequences*).

| Call | Input tokens | Output tokens |
|---|---|---|
| 8 conversation turns | 8 × (250 system + 1,000 memory + 50 current) + history 2,800 = **13,200** | 400 |
| Wrap-up draft (일기) | ~1,100 | ~250 |
| Emotion + title analysis | ~400 | ~200 |
| **Total** | **≈ 14,700** | **≈ 850** |

Cost: 14,700 × $0.15/M + 850 × $0.60/M ≈ **$0.0027** per entry. Without memory: ≈ 6,700 input tokens,
**≈ $0.0015**. Memory roughly doubles cost per entry; in absolute terms it is a fraction of a cent.

Automatic prompt caching applies to repeated prefixes of 1,024+ tokens; system prompt + memory would
qualify across the turns of one entry and halve that part of the input. Not counted above.

## Per user per month

| User | Entries / month | Model cost / month |
|---|---|---|
| Trial (1 a week) | 4 | ~$0.01 |
| **Habitual — the north star (3 a week)** | 13 | **~$0.04** |
| Heavy (2 a day) | 60 | ~$0.16 |
| Remembering greeting, once a day | — | ~$0.01 (≈1.2k input, 30 output) |

At 1,000 monthly active users with a habitual-heavy mix, model cost is in the tens of dollars a month.
Infrastructure (Supabase, Vercel, the deferred Socket.IO server) is not estimated here.

## Worst case: one abusive account

Today, with no length limit, a 20,000-character paste (~12k tokens) is resent with every later turn while
it stays in the last 20 messages: up to 20 × 12k = 240k input tokens per turn, ≈ **$0.036 per message**,
≈ $0.72 for a day's 20 messages — and more if the cap is raised. With a **2,000-character limit per
message** the worst turn is about 25k tokens (≈ $0.004), and **60 messages a day cost at most ≈ $0.23**.

## Recommendations

| # | Change | Why |
|---|---|---|
| 1 | **Cap a user message at 2,000 characters** (server-side, with a Korean notice) | Bounds the worst case; one diary paragraph is far shorter |
| 2 | **Raise the conversation cap from 20 to 60 user messages a day** | Fits 5–6 chat entries a day; worst case stays ≈ $0.23 per account per day |
| 3 | **Meter drafts and analysis separately** (e.g. 15 a day) instead of sharing the message meter | Today a heavy writer's analysis can be skipped because they talked a lot, and vice versa |
| 4 | **Set a monthly budget alert and a global kill switch** for model calls | A per-account cap does not bound many accounts; the public-link risk in `lib/usage.ts` is about strangers |
| 5 | Keep `gpt-4o-mini`; evaluate a cheaper small model only on Korean quality | `gpt-5-nano` is a third of the input price, but tone in Korean matters more than a cent |

## Design consequences for v2

- **Store a condensation per entry** (~60 tokens: date, emotion, two or three facts) when it is saved or
  wrapped up — one small extra call — and build the memory context from those, never from full entries.
  Keeps memory at ~1k tokens for two weeks and is reusable for the greeting and source chips.
- **Precompute the remembering greeting** after an entry is saved (or once a day), store it, and render
  the home screen from the stored line. Never call the model during the home page render; fall back to the
  plain greeting if nothing is stored.
- **Order the prompt for caching:** system prompt, then memory, then the conversation — the stable part
  first.

## What to measure (replaces this estimate)

1. Real token counts per entry and per user from the API's `usage` field (log counts, never text).
2. Time to first token for a conversation turn with and without memory, in production
   (`pnpm build && pnpm start`), against the live model — `?bench=1` uses the fake stream and cannot
   measure this.
3. Distribution of user message length and turns per entry in the beta, to re-check recommendations 1–3.
