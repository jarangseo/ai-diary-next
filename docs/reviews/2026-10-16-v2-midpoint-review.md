# v2 midpoint review — planning and design

> Date: 2026-10-16 · Scope: `PRODUCT_DIRECTION.md` v2, the design system and the v2 screen canvas ·
> Outcome: **the owner agreed with every point**; the changes are applied in the same pull request
> (`PRODUCT_DIRECTION.md` v2 revised) and in the design artifacts listed at the end.

A review written from two seats — a senior product planner and a senior product designer — taken after
the four v2 screen groups (chat, write, calendar, list edit) were drawn and before any code was written.

## Verdict

The skeleton is strong: decisions are written down, the data model is coherent, accessibility and
theming were built in from the start. But **the reason the product exists is not on any screen.** The
non-negotiable differentiator (an AI that answers from the user's own past entries) and half of the
one-line definition (looking back on the flow of emotions) had no design. What was drawn was a
well-made "AI chat plus a notepad", which gives a user no reason to choose it over a general assistant.

## Planning

### What works

- Two ways of writing that converge on one data shape (an entry plus its thread).
- The ownership rule — the AI never overwrites what the user wrote — held throughout.
- Summary rules (user's own words, nothing invented) and question chips that ride on the existing
  analysis call at no extra cost.
- Decisions recorded and agreed through pull requests.

### Problems, most important first

1. **Write mode produced the same text twice.** The "summary" of a written entry was ~80% the user's
   own sentences, shown beside them. It blurred which text is the diary and caused the three-pane
   width problem. → Drop the summary in write mode; offer to *add* only what the conversation
   contributed, appended to the body on explicit approval.
2. **The differentiator had no screens.** → Draw at least: a greeting that remembers recent entries;
   AI replies that cite past entries with a source chip; a setting that shows and controls what the AI
   may read.
3. **Looking back was reduced to 9px dots.** People return to a diary to meet their past selves. → Add
   a light retrospective in v2 (a monthly line on the calendar; "a year ago today" once data exists).
4. **The AI's emotion label could not be corrected.** One AI-chosen label for a mixed day feels like
   being judged. → Let the user change it; allow a secondary emotion.
5. **Trust and safety were undesigned:** disclosure that text is processed by an AI provider, export,
   deletion, app lock, and above all a protocol for crisis signals (self-harm) in conversation.
6. **No first-run experience.** Every mock showed a full sidebar.
7. **No failure states:** AI reply failure, summary failure, offline, and the daily usage limit that
   already exists in code (`countUserMessagesToday`).
8. **Scope too large for one release.** → Phase it (v2.0–v2.3) without pushing the differentiator last.
9. **Decision debt:** about twenty "to confirm" items had piled up across the screens.

## Design

### What works

- A real system: tokens, two themes sharing one layout, component rules applied consistently.
- The dark theme ("Night desk") has an identity that fits writing at night.
- Display face for diary text, sans for operable UI: entries read like pages.
- Panes appear only when they have content.
- Accessibility designed in rather than retrofitted.

### Problems, most important first

1. **The light theme is the generic default** (cream, serif, terracotta). The owner's references —
   riso cobalt and orange, crayon dogs, stripes, hand drawing — carried playfulness and a human hand;
   none survived. → Keep the system, add one signature from the references.
2. **After wrap-up the diary stayed a side panel** while the finished conversation held the centre. →
   Put the diary at the centre, collapse the conversation, and design the completion moment.
3. **Mobile was an afterthought.** Diaries are written at night, in bed, on a phone; the mobile home and
   mobile chat were not drawn. → Design those mobile-first.
4. **The display face changed with the theme** (Gowun Batang by day, Hahmlet by night): the user's own
   text changed shape, and a third Korean web font costs load time. → One display face.
5. **Emotion visualisation was small and weak** for half of the product's promise.
6. **Three serif columns of equal weight** gave no reading order (resolved by planning item 1).
7. **Inconsistent vocabulary** — 일기 / 정리된 일기 / 요약 / 원본 / 내가 쓴 일기; "원본" is developer
   language. → A glossary.
8. **Duplicate call to action**: `일기로 정리하기` in the header and in the AI's message at once.
9. **No motion was defined** beyond the reduced-motion rule.

## Process

- Good: plan → design system → screens, with decisions recorded.
- Gap: **no user validation yet**, though the canvas is a clickable prototype. Five people asked to
  "write today's diary" would answer whether the two modes are understood and whether an AI summary is
  accepted as *my* diary.
- Gap: many screens were drawn before checking them against the code (for example the one-thread-per-
  diary unique index), so a mismatch would cost several redraws.

## Priorities agreed

| # | Change | Why |
|---|---|---|
| 1 | Write mode: no summary; "일기에 덧붙이기" instead | Removes duplication and the third pane; simpler schema |
| 2 | Memory screens: remembering greeting, source chips, reference setting | Proves the reason to exist |
| 3 | Chat mode: diary at the centre after wrap-up; designed completion moment | The core reward |
| 4 | Mobile-first home and chat | The real context of use |
| 5 | Emotion correction, first run, failure and limit states, crisis protocol | Trust and retention |
| 6 | One display face; one signature element from the references | Brand |
| 7 | Glossary; consolidate open items | Clear decision debt |

Release phasing agreed: v2.0 chat mode + memory greeting + new shell; v2.1 write mode; v2.2 calendar,
list edit, export; v2.3 full archive retrieval.

## Not fixable by editing documents or mocks

- Usability test with five people on the clickable canvas (needs people).
- Final illustration art for the signature element (needs an illustrator; placeholders are drawn).
- Checking the design against the code (step 3 of the v2 process; next).
- Confirming the AI provider's data-use terms before the privacy notice copy is final.

## Artifacts

- Design system: https://claude.ai/artifact/FewgurJg4S21R4bg5jwUaq
- v2 screens canvas: https://claude.ai/artifact/UZYssW7Co3j3cSusLSWLKB
- Direction explorations: https://claude.ai/artifact/1vcaXQosn8sodyeaSHMGdS
