# Product Direction

> Created: 2026-05-31 · Status: **v0 (direction agreed, detailed roadmap TBD)**

This document records the **product north star** for ai-diary-next. It is the reference point for feature priority and design decisions.

---

## One-line definition

> **A personal AI diary app: record your day naturally by talking with AI, and look back on the flow of your emotions.**

The first draft started as a "shared diary chat for multiple people" (see README), but the
direction was redefined to be **personal-AI-diary-centric**.

## Core user loop

```
1. Write today's day  (write directly  OR  organize it by talking with AI)
        ↓
2. AI summarizes the conversation into a diary entry and analyzes emotion
        ↓
3. Look back on past entries and emotional trends via calendar/list
```

Keeping this loop turning without friction = the product's success criterion.

Differentiator: **even people who find it hard to journal alone** can complete an entry by talking with AI.

## Feature priority

| Feature | Position | Current status |
|---------|----------|----------------|
| Write / view diary | 🟢 core | working |
| AI conversation → diary summary | 🟢 core | working (GPT-4o-mini, `summarize` API) |
| Emotion analysis + display | 🟢 core | **not implemented** (only types/DB columns reserved) |
| Calendar retrospective | 🟢 core | **incomplete** (static hardcoded, no click behavior) |
| Settings page | 🟡 support | **empty** (`<div>Settings</div>`) |
| Multi-user realtime chat | ⏸️ deferred | works, but lower priority under a personal focus |

## ⚠️ Key decision record

**What to do with multi-user realtime chat (invite codes · online users · typing · socket.io)**

- **Decision: keep the realtime infra but defer it (do not remove).**
- **First complete** the personal-diary core (emotion analysis, calendar, settings).
- Decide later whether to revive "shared writing" as an extension.
- In other words, do **not touch** the multi-user chat features in near-term work.

## Near-term focus

Order for completing the personal-diary loop:

1. **Make the calendar dynamic** — compute current month, show whether an entry exists, click a date → go to that entry
2. **Implement emotion analysis** — after saving an entry, analyze emotion via OpenAI → store in DB → UI badge/icon
3. **Settings page** — basic skeleton (profile, theme, etc.)

> The execution approach (hands-on vs multi-agent harness) is TBD.

## Open / for later discussion

- The output shape of emotion analysis (score visualization? reflective questions?) and its UX
- How to visualize emotional trends on the calendar
- Clarify the entry flow for direct writing vs AI-conversation writing
- The final fate of the multi-user chat feature
