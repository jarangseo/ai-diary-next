# Product Direction

> Created: 2026-05-31 · Updated: 2026-10-16 · Status: **v1 agreed · v2 draft (pending owner review)**
>
> v2 revises v1's entry screen and core loop; where they conflict, the [v2 section](#v2--two-ways-to-write-draft)
> wins once it leaves draft. Everything else in v1 still stands.

This document records the **product north star** for ai-diary-next. It is the reference point for feature priority and design decisions.

---

## One-line definition

> **A personal AI diary app: record your day naturally by talking with AI, and look back on the flow of your emotions.**

The first draft started as a "shared diary chat for multiple people" (see README). v0 redefined it as
**personal-AI-diary-centric**. v1 keeps that definition and changes **how the user reaches it**:
from a calendar-first app to a **single-input, thread-based app**.

## v2 — two ways to write (draft)

> Drafted 2026-10-16. Recommendations below are proposals until the owner signs off; each
> decision marked **Proposed** becomes **Decision** when agreed.

### What changes from v1

v1 assumed every user starts by writing alone and talks to the AI afterwards. In practice there are
two kinds of days — days you want to talk it out, and days you want to write quietly — and the same
person has both. v2 makes the **home screen a "new entry" screen with two tabs**, one per way of writing.

| | v1 | v2 |
|---|---|---|
| Home | one input box, `Diary ⟷ Question` toggle | new-entry screen, `대화로 쓰기 ⟷ 직접 쓰기` tabs |
| How an entry starts | user writes the body | **either** a conversation **or** the body |
| AI after writing | analysis cards → wrap-up thread | same, for written entries; for chat entries the conversation *is* the start |
| `Question` mode | its own toggle position | folded into the chat tab (see below) |

### Home screen

```
┌─────────────┬──────────────────────────────────┐
│ + 새 일기   │      자랑님, 오늘은 어땠어요?     │
│ 📅 캘린더   │   [ 대화로 쓰기 | 직접 쓰기 ]     │
│ ─ 오늘 ──── │                                  │
│ 😌 퇴근길.. │   chat: messages + bottom input  │
│ ─ 어제 ──── │   write: large textarea + save   │
│ 🙂 운동..   │                                  │
│ [편집]      │                                  │
└─────────────┴──────────────────────────────────┘
```

- Opening the app lands here — no calendar, no "오늘 쓰기" button. The screen *is* the new entry.
- A greeting above the tabs invites the day ("자랑님, 오늘은 어땠어요?"). Copy varies by time of day
  and by whether today already has an entry; it is a prompt, never a form label.
- Sidebar, calendar dialog and list edit mode follow the v1 sections below unchanged.

### One entry, two starting orders

Both tabs produce the **same kind of item**: one `Diary` row (the canonical text) with one thread
beside it. The tabs differ only in which half comes first.

- **대화로 쓰기** — the conversation comes first. The AI asks about the day, follows up, and keeps the
  user talking. When the user presses **"일기로 정리"**, the AI drafts a body from the conversation; the
  user edits and saves it. The conversation stays attached as the entry's thread.
- **직접 쓰기** — the body comes first, exactly like the v1 editor. On save, analysis cards and the
  wrap-up thread appear as in v1's diary detail.

The sidebar, the calendar and the detail screen therefore never need to know which tab an entry came
from — but the origin is recorded, so the default tab can later be decided from usage data.

### Decision records (v2)

**What does a chat entry keep?** — **Proposed: both the conversation and a body.**
The conversation is the source; a body exists only after the user presses "일기로 정리" and accepts
the draft. This keeps v1's ownership rule (the AI never rewrites an entry on its own) while removing the
blank-page friction. A chat that is never wrapped up still appears in the sidebar, marked as unwrapped.

**When can the user switch tabs?** — **Proposed: freely until the entry starts, then fixed.**
Switching preserves whatever is typed (carrying v1's toggle rule over). Once the first message is sent
or the body is saved, the entry's origin is fixed — switching mid-conversation would leave the screen
with no clear thing to show. Starting the other way means starting a new entry.

**Default tab** — **Proposed: `대화로 쓰기` on first use, then the last-used tab.**
The first impression should match the product's identity ("a diary you write *with* AI"). After that,
respect habit. Revisit with origin data.

**Where did `Question` mode go?** — **Proposed: into the chat tab's AI.**
The v1 non-negotiable still stands: the AI must be able to answer from the user's own past entries
("you've mentioned overtime every Wednesday for two weeks"). In v2 that ability lives inside the chat
tab rather than behind a separate toggle. Without it the chat tab is "one more GPT" — so it is part of
the chat tab's definition, not a later add-on. The retrieval approach (full context vs. retrieval)
remains open.

**What is one entry?** — **Proposed: one conversation or one written body = one entry.**
A day can hold several entries (v1 already allows this). Coming back to an existing entry continues its
thread rather than creating a new one; "+ 새 일기" always starts a fresh one. No automatic merging per day.

**AI tone in the chat tab** — **Proposed: curious, not flattering.**
Mostly questions that help the user say more (what happened, how it felt, what stayed with them); brief
acknowledgement, no praise or consolation by default — the same reasoning as v1's analysis cards. It
should also recognize when the user is done and offer "일기로 정리" rather than asking forever.

**When do emotion analysis and the title run?** — **Proposed: when the body is saved, for both tabs.**
Analysis reads the canonical text, so a chat entry is analyzed at "일기로 정리". Until then an unwrapped
chat shows a neutral icon and a provisional title from the first message.

**List edit mode scope** — **Proposed: delete and rename for v2.** Multi-select delete and renaming the
AI title. Merging entries is deferred.

### Schema implications (v2)

- A `kind = 'diary'` thread requires a `diary_id` (`threads_diary_kind_ck`), but a chat entry has no body
  yet. **Create the `diaries` row when the conversation starts**, with empty content, and fill it at
  "일기로 정리" — this keeps one entry = one row and leaves the constraint intact.
- Add an origin column on `diaries` (`'chat' | 'write'`) and a way to tell an unwrapped entry
  (empty body or an explicit flag). This is a new migration; numbering and applying it is a human
  decision per `docs/HARNESS.md`.
- `/diary/[date]` → `/diary/[id]` (already planned in v1) becomes a prerequisite, since every entry,
  chat or written, is opened by id.

### Process for v2

Plan → design → review → build, each stage closed before the next:

1. **This section** — owner reviews and turns every **Proposed** into a **Decision**.
2. **Design** in Claude Design — a design system first (color incl. the 7-emotion palette in
   `src/lib/emotion.ts`, type, spacing, components), then the key screens: home (both tabs, empty and
   mid-entry), wrap-up draft, sidebar, calendar dialog, list edit, mobile drawer, empty/loading/error,
   light and dark.
3. **Review** — Claude Code checks the design against the code (token mapping to `variables.scss`,
   reusable `Calendar` / `Thread` / `SplitPanel`, schema fit, the 250 KB bundle budget) and the result
   is written up as a handoff spec.
4. **Build** — one issue per stage, small PRs: tokens → app shell (sidebar + layout) → write tab →
   chat tab → "일기로 정리" → calendar dialog → list edit → remove the calendar home and `/diary/write`.

No in-app versioning: v2 replaces v1's screens progressively on `main`, and this document plus git
history is the record of what changed.

## What changed in v1 (and why)

v0's entry point was the calendar: pick a date, then face an empty textarea. That structure only
serves users who *already* decided to write. v1 replaces it with one input box on open.

| | v0 | v1 |
|---|---|---|
| Entry point | calendar → date → empty editor | one input box, `Diary`/`Question` toggle |
| AI's role | conversation → summarized into a diary | diary → instant analysis → conversation to wrap up |
| Unit of content | one entry per date | many entries per date, each its own thread |
| Retrospective | calendar screen | sidebar list (always visible) + calendar dialog |

Two reasons drive the change:

1. **A reason to open the app every day.** A diary app does not die from bad UI; it dies because there
   is no reason to open it. `Question` mode is a daily entry point on its own.
2. **The AI loop is inverted.** v0 required a conversation *before* an entry existed, which is high
   friction. v1 lets the user write alone and the AI reacts afterwards — analysis, then follow-up
   questions that wrap up the day.

## Non-negotiable differentiator

> **`Question` mode must answer from the user's own past entries.**

A general-purpose chat mode would make this "one more GPT", which cannot win against Gemini/ChatGPT.
Answering from the user's diary archive ("your last two weeks mention overtime every Wednesday") is
something a general assistant cannot do — and it makes writing more entries directly improve the
answers. If `Question` mode ever ships as a plain LLM passthrough, the product has lost its reason to exist.

## Core user loop

```
1. Open the app → the input box is already in Diary mode
        ↓
2. Write today (or ask a question about the past → Question thread)
        ↓
3. On save, AI analyzes emotion and opens a thread beside the entry
        ↓
4. Converse to wrap up the day; optionally fold what surfaced back into the entry
        ↓
5. Look back via the sidebar list (emotion colors) and the calendar dialog
```

Keeping this loop turning without friction = the product's success criterion.

## v1 screen structure

Four screens, all sharing a persistent sidebar.

**1. Home** — sidebar / center input box with a `Diary ⟷ Question` toggle.

- The toggle **defaults to `Diary`**. The default state is a statement of identity: `Question`-first
  reads as "a chatbot that also has a diary"; `Diary`-first reads as "a diary that can also ask".
- Error cost is asymmetric — typing an entry into `Question` by mistake is annoying, switching
  before a question is cheap. Default to the expensive mistake's safe side.
- Switching modes **must preserve whatever is already typed**.
- A keyboard shortcut for the toggle.
- UI labels should name the action, not the feature (Korean UI strings; code identifiers stay English).
- The default may later become state-aware (e.g. `Question` once today's entry exists), but while
  today is unwritten, `Diary` wins.

**2. Question thread** — sidebar / question + answer thread, with the user's past entries as context.

**3. Diary editor** — sidebar / large center editor / save.

**4. Diary detail** — sidebar / **center: the entry (the canonical text)** / **right: a thread scoped to that entry**.

- The right panel opens with analysis cards (emotion summary + reflective questions). Tapping a card
  sends it as the thread's first message.
- Cards should lean on **questions rather than reactions**. Praise/consolation cards go stale within
  days and turn the product into a flattery bot; questions fuel the wrap-up conversation.
  (`DiaryEmotion.questions` already exists for this.)
- Opening a past entry shows the same three-pane layout, so the user can converse *now* about how
  they felt *then*.

## Sidebar

The sidebar is a list of **items**, not dates — a day can hold several entries and several questions.

```
[+ New]
─ Today ────────
😌  Sunset on the way home
💬  Why am I so tired lately
😤  That meeting ran way too long
─ Yesterday ────
🙂  Finally worked out
```

- **Row = `[emotion icon] AI-generated title`.** Never ask the user for a title — that turns writing
  into an assignment. Generate it alongside emotion analysis, at no extra API call.
- **Diary and Question items share one list**, distinguished by icon (emotion icon vs. a neutral
  chat icon). One chronological stream reads as "the flow of my day". Add filtering later if volume demands it.
- **Dates appear only as group headers** (`Today / Yesterday / This week / August`), preserving the
  sense of time without making the date the item's identity.
- **Emotion is carried by color, not just glyph.** Scanning the list should show a drift of color —
  the sidebar then doubles as a miniature emotion graph and keeps the retrospective axis always on screen.

## Calendar

- Reached from a **sidebar button, opened as a dialog** (no dedicated route in v1).
- Each day shows **one dot per entry, in chronological order** — the intra-day flow, not ranked by intensity.
- Dot count is capped and overflow collapses to `+N`. The cap is responsive: ~5 on desktop, ~3 on mobile.
- `isRecordOnly` entries have no emotion — render a **grey dot**. "Something was written" is itself
  information; a day with entries must not look like an empty day.
- **The dot palette is the same palette as the sidebar icons and the analysis cards.** If those three
  disagree, the colors are decoration rather than meaning.
- **Clicking a date filters the sidebar to that day and closes the dialog.** With multiple entries per
  date, "jump to *the* entry" no longer exists — the calendar's role is a date filter for the sidebar,
  not a second navigation tree.
- Persist the open state in the URL (e.g. `?calendar=1`) so the back button closes the dialog instead
  of leaving the app.
- Month navigation + a "today" button; reuse the existing calendar month logic.

## Schema implications

**`Diary`'s primary key must change.** Today it is `(user_id, date)` — "one entry per day" is baked into
the schema, so a second entry on the same date overwrites the first.

- PK becomes `id`; `date` demotes to an **indexed attribute**.
- `saveDiary`'s upsert conflict key `(user_id, date)` loses its meaning — create and update must
  become explicit.
- `/diary/[date]` becomes `/diary/[id]`. Date is a filter, not an identity.
- Add a `title` field, populated by the same AI call that does emotion analysis.

The work is small now and much more painful after data accumulates — do it as part of this direction change.

## ⚠️ Decision records

**Does the right-hand thread rewrite the entry?**

- **Decision: only on an explicit user action** ("add this to my entry"). Never automatically.
- Auto-rewriting produces text the user does not recognize as their own, which is fatal for a diary.
  Explicit folding keeps ownership with the user while not discarding good sentences from the conversation.

**Do the two modes stay separate apps?**

- **Decision: they must link both ways.** A `Question` answer that references a day offers to open that
  entry; an entry's thread can widen into a `Question` across similar days. The toggle is then two zoom
  levels of one app (a day vs. the whole archive), not two products sharing a shell.

**Toggle vs. automatic mode detection**

- **Decision: explicit toggle for v1.** Auto-detection needs correction/undo UX, which multiplies the
  cost of shipping the first screens. An explicit toggle cannot be wrong.
- Record which mode each item was created in, so a later decision about auto-detection rests on usage
  data rather than intuition.

**Calendar as a dialog**

- **Decision: dialog is a v1-only placement.** Retrospection is the product's long-term payoff; once a
  user has months of entries it becomes the main surface and will deserve a full screen with the
  calendar, emotion trends, and search. Not now — but recorded so promoting it later is not a debate.

**Multi-user realtime chat (invite codes · online users · typing · socket.io)** *(carried over from v0)*

- **Decision: keep the realtime infra but defer it (do not remove).**
- The v1 threads do **not** need socket.io — response streaming is sufficient.
- Decide later whether to revive "shared writing" as an extension. Do **not** touch the multi-user
  chat features in near-term work.

## Near-term focus

1. **Finish emotion analysis** — data layer and AI engine are done; trigger wiring + UI remain.
   Tracker: `docs/EMOTION_ANALYSIS.md`. v1 depends on this (sidebar icons, calendar dots, analysis cards).
2. **Schema migration** — `Diary` PK → `id`, `date` indexed, `title` added, routes updated.
3. **Thread model** — new table for threads/messages; `Diary` stays the canonical per-entry document.
4. **v1 screens** — home + toggle → question thread → editor → detail with the side thread.
5. **Sidebar** — item list, AI titles, date group headers, emotion colors.
6. **Calendar dialog** — dots with `+N` overflow, date → sidebar filter.
7. **Settings page** — still an empty placeholder.

## Open / for later discussion

- Thread/message table design, and how a thread relates to its `Diary` row
- The emotion color palette (shared by sidebar icons, calendar dots, and analysis cards)
- How `Question` mode retrieves past entries (full context vs. retrieval) and its cost profile
- How AI titles are generated and whether the user can rename them
- Visualizing emotional trends over time (beyond per-day dots)
- The final fate of the multi-user chat feature
