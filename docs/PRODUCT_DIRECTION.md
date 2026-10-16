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

> Drafted 2026-10-16. Items marked **Decision** were agreed by the owner; items marked
> **Proposed** are recommendations still awaiting sign-off.

### What changes from v1

v1 assumed every user starts by writing alone and talks to the AI afterwards. In practice there are
two kinds of days — days you want to talk it out, and days you want to write quietly — and the same
person has both. v2 makes the **home screen a "new entry" screen with two tabs**, one per way of writing,
and gives every entry an **AI summary** that pulls everything about that entry into one diary text.

| | v1 | v2 |
|---|---|---|
| Home | one input box, `Diary ⟷ Question` toggle | new-entry screen, `대화로 쓰기 ⟷ 직접 쓰기` tabs |
| How an entry starts | user writes the body | **either** a conversation **or** the body |
| Entry screen | entry + side thread | chat: 2 panes · write: 3 panes (below) |
| Final diary text | the user's body | an auto-updating **summary** of everything in the entry |
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

### Entry screens — **Decision**

```
대화로 쓰기 — 2 panes                 직접 쓰기 — 3 panes
┌────────┬──────────┬───────┐        ┌────────┬───────┬────────┬───────┐
│sidebar │ AI chat  │summary│        │sidebar │ body  │ thread │summary│
└────────┴──────────┴───────┘        └────────┴───────┴────────┴───────┘
```

- **대화로 쓰기** — the user and the AI talk about the day; beside the chat, the **summary** turns the
  conversation into a diary text. The summary *is* this entry's diary.
- **직접 쓰기** — the user's **body** (the original, exactly as written), a **thread** with the AI
  about that body, and a **summary** of the body and the thread together.
- The summary is the one thing both modes share: it is what the entry "says" once everything is in.

### Decision records (v2)

**How does the summary update?** — **Decision: automatically.**
It regenerates in the background after AI replies, debounced over a few turns rather than on every
message (cost, and a text that keeps shifting is hard to read). There is no "wrap up" button and no
user editing of the summary for now. Before there is enough to summarize (the first one or two turns),
the pane shows an empty state such as "대화를 더 나누면 여기에 일기가 정리돼요".
This does not break v1's ownership rule: the summary is its own field and never overwrites anything
the user wrote — the body (write mode) and the user's messages (chat mode) stay as they were.

**What do the sidebar title and emotion color follow?** — **Decision: the summary.**
When a written entry has no conversation yet, there is no summary, so they follow the body.

**Summary pane before a written entry has a thread** — **Decision: collapsed.**
Summarizing the body alone would put a near-copy of it right beside it. The pane stays collapsed until
the first thread message, and the thread pane takes the space.

**Screen width for three panes** — **Decision: collapsible sidebar on desktop, tabs when narrow.**
Write mode is four columns including the sidebar, which is tight on a 1280–1440px laptop. The sidebar
collapses on desktop; on narrow screens `원본 | 대화 | 요약` become tabs, and on mobile they always are.
This is a screen the design stage must draw and check, not one to settle in code.

**How the summary is written** — **Proposed.**
The existing chat-room summarizer (`src/app/api/chat/summarize/route.ts`) is not reused as is — it
saves immediately, caps output at 3–5 sentences, and asks for a "warm" tone that embellishes. Instead:
first person; keep the user's own words and phrasing wherever possible; never add facts the user did not
say; length proportional to what was said. A diary only stays worth rereading if it sounds like its writer.

**Does the AI start the thread after a written entry?** — **Proposed: no — it offers question chips.**
On save the thread pane shows two or three question chips about the entry ("회의가 길어진 게 왜 신경
쓰였어요?"); tapping one sends it as the first message, ignoring them costs nothing. An unprompted AI
message would feel like homework to someone who just chose to write alone, while an empty thread gives
no place to start. The chips come from the emotion analysis that already runs on save
(`DiaryEmotion.questions`), so they add no API call. Chip tap rate later shows whether the AI should
speak first.

**When can the user switch tabs?** — **Proposed: freely until the entry starts, then fixed.**
Switching preserves whatever is typed (carrying v1's toggle rule over). Once the first message is sent
or the body is saved, the entry's mode is fixed — the two modes have different layouts. Starting the
other way means starting a new entry.

**Default tab** — **Proposed: `대화로 쓰기` on first use, then the last-used tab.**
The first impression should match the product's identity ("a diary you write *with* AI"). After that,
respect habit. Record each entry's mode so this can be revisited with data.

**Where did `Question` mode go?** — **Proposed: into the chat tab's AI.**
The v1 non-negotiable still stands: the AI must be able to answer from the user's own past entries
("you've mentioned overtime every Wednesday for two weeks"). In v2 that ability lives inside the chat
tab rather than behind a separate toggle. Without it the chat tab is "one more GPT" — so it is part of
the chat tab's definition, not a later add-on. The retrieval approach (full context vs. retrieval)
remains open.

**What is one entry?** — **Proposed: one conversation or one written body = one entry.**
A day can hold several entries (v1 already allows this). Coming back to an existing entry continues its
thread rather than creating a new one; "+ 새 일기" always starts a fresh one. No automatic merging per day.

**AI tone in conversation** — **Proposed: curious, not flattering.**
Mostly questions that help the user say more (what happened, how it felt, what stayed with them); brief
acknowledgement, no praise or consolation by default — the same reasoning as v1's analysis cards.

**When does emotion analysis run?** — **Proposed: on the text the sidebar follows.**
On save for a written entry (the body), and again when its summary first appears; for a chat entry,
when the summary updates. It shares the summary's debounce so it never runs per message.

**List edit mode scope** — **Proposed: delete and rename for v2.** Multi-select delete and renaming the
AI title. Merging entries is deferred.

### Schema implications (v2)

- A `kind = 'diary'` thread requires a `diary_id` (`threads_diary_kind_ck`), but a chat entry has no
  body. **Create the `diaries` row when the entry starts** — one entry = one row, constraint intact.
- New columns on `diaries`: `mode` (`'chat' | 'write'`) and `summary` (the AI text, separate from
  `content`, which stays the user's own body and is empty for chat entries). Possibly a summary
  timestamp to drive the debounce. This is a new migration; numbering and applying it is a human
  decision per `docs/HARNESS.md`.
- `/diary/[date]` → `/diary/[id]` (already planned in v1) becomes a prerequisite, since every entry is
  opened by id.

### Process for v2

Plan → design → review → build, each stage closed before the next:

1. **This section** — owner turns every **Proposed** into a **Decision**.
2. **Design** in Claude Design — a design system first (color incl. the 7-emotion palette in
   `src/lib/emotion.ts`, type, spacing, components), then the key screens: home (both tabs, empty and
   mid-entry), the 2-pane chat entry, the 3-pane write entry (incl. collapsed summary and narrow-width
   tabs), sidebar, calendar dialog, list edit, mobile, empty/loading/error, light and dark.
3. **Review** — Claude Code checks the design against the code (token mapping to `variables.scss`,
   reusable `Calendar` / `Thread` / `SplitPanel`, schema fit, the 250 KB bundle budget) and the result
   is written up as a handoff spec.
4. **Build** — one issue per stage, small PRs: tokens → app shell (sidebar + layout) → write tab +
   3-pane entry → chat tab + 2-pane entry → summary engine → calendar dialog → list edit → remove the
   calendar home and `/diary/write`.

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
