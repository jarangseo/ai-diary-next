# Product Direction

> Created: 2026-05-31 · Updated: 2026-10-18 · Status: **v2 agreed, revised after the midpoint review; v2.0 screens specified** · v1 kept as an appendix
>
> Who it is for, how success is measured, cost and timeline: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md).
>
> v2 revises v1's entry screen and core loop; where they conflict, the [v2 section](#v2--two-ways-to-write)
> wins. Everything else in v1 still stands.

This document records the **product north star** for ai-diary-next. It is the reference point for feature priority and design decisions.

---

## One-line definition

> **A personal AI diary app: record your day naturally by talking with AI, and look back on the flow of your emotions.**

The first draft started as a "shared diary chat for multiple people" (see README). v0 redefined it as
**personal-AI-diary-centric**. v1 keeps that definition and changes **how the user reaches it**:
from a calendar-first app to a **single-input, thread-based app**.

## v2 — two ways to write

> Agreed 2026-10-16 · revised the same day after the
> [midpoint review](./reviews/2026-10-16-v2-midpoint-review.md), whose every point the owner accepted.

### What changes from v1

v1 assumed every user starts by writing alone and talks to the AI afterwards. In practice there are
two kinds of days — days you want to talk it out, and days you want to write quietly — and the same
person has both. v2 makes the **home screen a "new entry" screen with two tabs**, one per way of writing,
and makes the AI **remember**: it greets you with what you wrote recently and can point back to past entries.

| | v1 | v2 |
|---|---|---|
| Home | one input box, `Diary ⟷ Question` toggle | new-entry screen, `대화로 쓰기 ⟷ 직접 쓰기` tabs; a greeting that remembers |
| How an entry starts | user writes the body | **either** a conversation **or** the body |
| The diary text | the user's body | chat: an AI-drafted **일기** the user can edit · write: **내 글**, plus additions the user accepts |
| Entry screen | entry + side thread | chat: chat → 일기 at the centre after wrap-up · write: 내 글 → 내 글 + 대화 |
| `Question` mode | its own toggle position | folded into the AI's memory (see below) |

### Vocabulary

UI copy uses three words, nowhere else synonyms:

| Word | Means | Never call it |
|---|---|---|
| **내 글** | what the user wrote in 직접 쓰기 | 원본, 본문 |
| **대화** | the conversation with the AI, in either mode | 스레드, 채팅 |
| **일기** | the entry's canonical text: the AI-drafted text of a chat entry, or 내 글 of a written one | 요약, 정리된 일기 |

Code keeps its own names (`content`, `summary`, `thread`).

### Home screen

```
┌─────────────┬──────────────────────────────────┐
│ + 새 일기   │      자랑님, 오늘은 어땠어요?     │
│ 📅 캘린더   │  어제 운동 다시 시작했다고 했죠.   │
│ ─ 오늘 ──── │   [ 대화로 쓰기 | 직접 쓰기 ]     │
│ 😌 퇴근길.. │   chat: messages + bottom input  │
│ ─ 어제 ──── │   write: large textarea + save   │
│ 🙂 운동..   │                                  │
└─────────────┴──────────────────────────────────┘
```

- Opening the app lands here — no calendar, no "오늘 쓰기" button. The screen *is* the new entry.
- The greeting invites the day and, when there is something to remember, **remembers it** in one line
  ("어제 운동 다시 시작했다고 했죠. 오늘은요?"). Never more than one line, never a judgement.
- **Mobile is the primary surface** (diaries are written at night, on a phone). Home and chat are
  designed at phone width first and widened for desktop.

### Entry screens — **Decision**

```
대화로 쓰기                                  after wrap-up
┌────────┬──────────────────────┐          ┌────────┬────────────────────────┬────────┐
│sidebar │ 대화 (full width)    │   →      │sidebar │  일기 (centre, hero)   │ 대화 ▸ │
└────────┴──────────────────────┘          └────────┴────────────────────────┴────────┘

직접 쓰기 — after save                       after the first message
┌────────┬──────────────────────┐          ┌────────┬───────────┬───────────┐
│sidebar │ 내 글 (full width)   │   →      │sidebar │  내 글    │   대화    │
│        │ [question chips]     │          │        │ +덧붙이기 │           │
└────────┴──────────────────────┘          └────────┴───────────┴───────────┘
```

- **대화로 쓰기** — while talking, the conversation takes the full width. At wrap-up the **일기 moves to
  the centre** and the conversation collapses to a side panel the user can reopen (`대화 보기`). The
  moment the 일기 appears is a designed transition — the product's reward — not a panel popping in.
- **직접 쓰기** — after save, 내 글 fills the screen with an invitation and question chips below. When a
  conversation starts it opens beside 내 글: **two panes, never three**.

### Decision records (v2)

**What is the diary?** — **Decision: one canonical text per entry.**
A chat entry's 일기 is the AI-drafted text; a written entry's 일기 is 내 글. There is never a second
"summary" of something the user already wrote. *(Revised: v2 first had a summary in write mode too —
it duplicated ~80% of 내 글 and created the third pane.)*

**When is a chat entry's 일기 made?** — **Decision: at wrap-up, not while talking.**
- Explicit: `일기로 정리하기`. The header shows it **only until** the AI offers it in the conversation,
  so the two never appear at once.
- The AI may offer it after a few turns ("오늘 이야기 정리해 둘까요?").
- Safety net: a chat left without wrap-up is drafted the next time the entry is opened or listed.
- Re-wrap: talking more after a draft exists shows `다시 정리`.

**Can the user edit the AI's draft?** — **Decision: yes.** *(Revised: was "no editing".)*
`다듬기` turns the 일기 into an editor. Once edited, `다시 정리` warns before replacing it
("다시 정리하면 고친 부분이 바뀌어요"). The ownership rule holds: the AI never overwrites what the user wrote
or edited without being asked.

**Folding a conversation into a written entry** — **Decision: `일기에 덧붙이기`, never automatic.**
When a conversation about 내 글 surfaces something new, the AI proposes a short addition — only what the
conversation added, in the user's words. The user accepts (appended to 내 글), edits, or dismisses it.
This replaces the write-mode summary.

**How the AI drafts** — **Decision.** First person; the user's own words wherever possible; nothing the
user did not say; length proportional to what was said. The existing chat-room summarizer is not reused
as is (it saves immediately, caps at 3–5 sentences and embellishes).

**Memory — the differentiator** — **Decision: ships in v2.0, in three visible places.**
1. The greeting remembers one recent thing.
2. In conversation, the AI may draw on past entries; a reply that does shows a **source chip**
   (`10월 14일 일기`) that opens the entry. A conversation can widen from today to "요즘" this way, which is
   where v1's `Question` mode now lives.
3. Settings: `지난 일기 참고하기` (on by default), with a line explaining what the AI reads.
Retrieval in v2.0 is **layered** *(revised 2026-10-18; was "the recent window only")*:
- **Last 14 days** (the user's own calendar): each entry's 일기, condensed (#107).
- **Older**: one **memory note** per entry, a single line saying what happened, written by the same
  call that analyses the emotion (no extra model call). Newest first, capped (#108).
- **Much older, later**: monthly roll-ups of the notes, if the notes alone outgrow their cap.

Concatenating every day's summary as-is was considered and rejected, because it grows without bound
(about 36k characters a year) on every reply. Full-archive retrieval, meaning search over everything, is
still v2.3. If memory ships as a plain LLM passthrough, the product has lost its reason to exist.

**Emotion — the AI suggests, the user owns it** — **Decision.**
Each entry has a primary emotion and an optional secondary one. Tapping the emotion chip lets the user
change either; a user choice is never overwritten by re-analysis. Analysis runs on the 일기 (chat: at each
draft; write: on save and when an addition is accepted).

**Looking back** — **Decision: a light retrospective inside v2.**
The calendar shows a one-line month summary ("이번 달은 지침 9번, 평온 6번이었어요"), and the home shows
"1년 전 오늘" once an entry from a year ago exists. Fuller trend views stay later, but the emotion palette
gets at least one large, not-a-dot appearance (the month line, the completion moment).

**Sidebar title and emotion color** — **Decision: follow the 일기.**

**Saving a written entry** — **Decision: title, emotion and question chips in one call; no summary.**

**Thread UI on a written entry** — **Decision: hidden until the user starts a conversation.** Tapping a
chip opens the conversation with that question as the AI's first message.

**Screen width** — **Decision: at most two content panes**; the sidebar collapses to an icon rail when a
conversation is open beside 내 글; narrow screens use tabs (`내 글 | 대화`, `일기 | 대화`).

**When can the user switch tabs?** — **Decision: freely until the entry starts, then fixed.** Switching
keeps what is typed.

**Default tab** — **Decision: `대화로 쓰기` on first use, then the last-used tab.** Each entry records its mode.

**What is one entry?** — **Decision: one conversation or one 내 글 = one entry.** A day can hold several;
returning to an entry continues its conversation.

**AI tone** — **Decision: curious, not flattering.** Questions that help the user say more; brief
acknowledgement; no praise or consolation by default.

**Trust and safety** — **Decision: designed before v2.0 ships.**
- First run and settings say plainly that entries are sent to an AI provider to reply and draft, and how
  to turn memory off. (Confirm the provider's data-use terms before the copy is final.)
- Export (Markdown/JSON) in settings; deleting the account deletes every entry and conversation.
- **Crisis protocol:** when a conversation signals self-harm or suicide, the AI stops diary questions,
  responds with care, and shows crisis lines **for the user's country** (Korea: 자살예방상담전화 109,
  정신건강위기상담전화 1577-0199). The app never presents itself as therapy. See *Beyond Korea* below.
- App lock is v2.3.

**First run, failure and limits** — **Decision: every state has a screen.**
First run (empty sidebar with what will appear there, a first greeting without memory), AI reply failure
(the user's text is kept, `다시 시도`), draft failure, offline, and the daily limit already enforced in
code (`countUserMessagesToday`) told plainly ("오늘은 여기까지 대화할 수 있어요. 쓴 글은 그대로 저장돼요.").

**List edit mode scope** — **Decision: delete and rename.** Delete always confirms with the titles listed.

**Visual identity** — **Decision: one display face, one signature.** Gowun Batang in both themes (the
Night desk theme changes color, not the shape of the user's words). The signature, from the owner's
references, is a single-ink hand-drawn illustration used only in empty states, first run and the
completion moment. Details: the design system README.

### Screen specs (v2.0) — decided 2026-10-18

The v2.0 areas are specified rule by rule on the
[screen canvas](https://claude.ai/artifact/UZYssW7Co3j3cSusLSWLKB) (private; ask the owner to share it),
on two pages: **1 대화로 쓰기 · 동선과 명세** (a flow diagram and the screen spec) and
**5 처음 · 예외 · 설정 · 명세**. Each line there is one rule and is meant to become one check in an
issue's *Done when*. Shared states (hover, pressed, focus, disabled) are defined once in the design
system, not per screen.

The canvas is the full spec. The decisions below are the ones that were open until 2026-10-18; the
owner took the recommended option on every one.

**대화로 쓰기**

| Question | Decision |
|---|---|
| When does the AI offer wrap-up? | After **4 user messages**. If declined (`조금 더 얘기할게요`), not again until 4 more |
| Message length | **2,000 characters**; the remaining count shows from 1,800 |
| Title before wrap-up | The first message's **first 30 characters**, replaced by the AI title at wrap-up (header and sidebar) |
| Source chips per reply | **At most 3** |
| Input while drafting | **Locked** until the draft is done |
| Enter on mobile | **New line**; sending is the button only. Desktop keeps Enter to send, Shift+Enter for a new line |
| Wrap-up after a crisis signal | The AI **does not offer** it in that conversation; the user can still wrap up by hand |
| Daily-limit copy | The design's: "오늘은 여기까지 대화할 수 있어요. 쓴 글은 그대로 저장돼요." |

**처음 · 예외 · 설정**

| Question | Decision |
|---|---|
| When is first run shown? | Whenever the user has **no entries**, including after deleting them all |
| Greeting without a name | "반가워요. 오늘은 어땠어요?" |
| Messages unsent while offline | A **`다시 보내기`** button once back online; never sent automatically, so a message that did reach the server is not sent twice |
| When does the daily limit reset? | **The user's own midnight**, from a time zone stored per user. *(Revised the same day: first "midnight Korea time", changed when the service was confirmed as not Korea-only.)* Until that column exists (migration 002) the code keeps UTC (#59) |
| Detecting a crisis signal | The model judges while replying, and a word list double-checks explicit phrases. When unsure, show the crisis card: missing one is worse than showing it needlessly |
| Export in v2.0 | **Hidden**; it ships in v2.2 as the release plan says |
| Account deletion label | **"계정과 모든 일기 삭제"**; the confirmation keeps today's "일기와 대화를 모두 지우고 탈퇴할까요?" |
| Where the theme is saved | **Per device** (browser), so no new column |

**Still open, for a person:** the provider sentence in settings ("[제공사 약관 확인 후 기재]") needs
OpenAI's API data-use terms checked: how long sent content is kept, and whether it is used for
training. It is required before v2.0 ships, but it does not block building.

**Code that disagrees with these decisions** (each becomes its own issue):
- `countUserMessagesToday` (`src/lib/threads.ts`) counts from **UTC** midnight, not the user's (#59,
  blocked on migration 002).
- The over-limit notice in `src/lib/usage.ts` uses different copy ("오늘 AI 응답 한도를 다 썼어요…") (#60).
- The settings page labels account deletion `탈퇴하기`, and `e2e/withdrawal.spec.ts` asserts that label (#61).

### Beyond Korea — **Decision (2026-10-18): Korean first, global-ready from the start**

The service is not meant to stay in Korea. v2.0 launches in Korean, but the pieces that are expensive
to retrofit are built for other countries now; translations and per-market launches come later.
Retrofitting after v2 would mean touching every screen again.

| Area | Decision |
|---|---|
| Time | Every "today" (daily limit, sidebar 오늘/어제, greeting time of day, "1년 전 오늘", an entry's default date) uses the **user's time zone, stored per user** on the server. It is set from the browser at sign-up and changeable in settings. Never a hard-coded zone. It is not sent per request, because a client-supplied zone would let anyone reset the daily limit at will |
| UI strings | An **i18n layer goes in at the start of the v2 build**, before the first v2 screen, so no v2 screen is written with inline copy. Korean is the source language; other languages are added later |
| Dates and numbers | Formatted with `Intl` for the user's locale. No hand-built "10월 16일 금요일" |
| AI | Replies, drafts and titles follow the **language the user writes in**. Emotion keys stay language-neutral in code (`tired`, not `지침`), with labels per locale |
| Crisis protocol | Lines **per country**. Korea's are above. A country without a curated list shows an international helpline directory (which one: open, to choose before a non-Korean launch) |
| Fonts | Gowun Batang covers Hangul. Other scripts need a fallback display face, chosen with the first non-Korean locale |
| Law | Before launching where GDPR-type law applies: consent at sign-up, export (would move from v2.2 to that launch), and stating where data is processed. Account deletion already exists |

### Schema implications (v2)

### Schema implications (v2)

- **Create the `diaries` row when the entry starts** (a `kind = 'diary'` thread requires a `diary_id`).
- New on `diaries`: `mode` (`'chat' | 'write'`); `summary` (chat entries only: the AI draft, which the
  user may edit) with `summary_edited_at` and a way to tell an outdated draft; `emotion_secondary`;
  `emotion_source` (`'ai' | 'user'`) so re-analysis never overwrites a user choice. Accepted additions
  are appended to `content`.
- Per-user settings: `memory_enabled`, `timezone` (IANA name, e.g. `Asia/Seoul`) and `locale`. They
  live in a user settings table, since the app has no users table of its own (`user_id` is the OAuth id).
- `/diary/[date]` → `/diary/[id]` is done (#47). One migration (002); numbering and applying it is a
  human decision per `docs/HARNESS.md`.

### Release plan

| Release | Contents |
|---|---|
| **v2.0** | New design system and shell (sidebar, mobile-first home), 대화로 쓰기 with wrap-up and the 일기 at the centre, memory greeting + layered context (recent window + older memory notes) + source chips + setting, emotion correction, first run, failure and limit states, privacy notice, crisis protocol; global-ready foundations (stored time zone, i18n layer, `Intl` dates, per-country crisis lines), still in Korean only |
| **v2.1** | 직접 쓰기, question chips, `일기에 덧붙이기` |
| **v2.2** | Calendar dialog with the month line, list edit, export, "1년 전 오늘" |
| **v2.3** | Full-archive retrieval, app lock |

### Process for v2

1. **This section** — agreed and revised 2026-10-16.
2. **Design** — design system and the screen canvas (links in the review). The v2.0 areas are
   specified rule by rule (2026-10-18, see *Screen specs* above); v2.1+ areas are specified just
   before they are built.
3. **Usability test** — five people, the clickable canvas, one task: "오늘 일기를 써보세요". Before build.
4. **Review against the code** — token mapping, reusable components, schema fit, the 250 KB budget;
   written up as a handoff spec.
5. **Build** — by the release plan, one issue per stage, small PRs.

No in-app versioning: v2 replaces v1's screens progressively on `main`, and this document plus git
history is the record of what changed.

---

# Appendix — v1 (superseded)

> Kept as the record of how v2 was reached. **Superseded by the v2 section above:** the
> `Diary ⟷ Question` toggle, the three-pane detail, the analysis cards and the near-term list below no
> longer describe the plan. Where this appendix and v2 differ, v2 wins. Do not plan work from it.

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
