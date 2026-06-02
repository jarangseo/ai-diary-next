# Emotion Analysis — build tracker

> Created: 2026-06-01 · Updated: 2026-06-02 · Status: **in progress** (data layer + AI engine + trigger done; **UI next**)

Tracks the **emotion analysis** feature — a 🟢 core item in
[PRODUCT_DIRECTION](./PRODUCT_DIRECTION.md). Goal: after an entry is written, infer the day's
emotion, store it, and surface it (badge + reflection + calendar color) so the user can look
back on emotional trends.

Mark each stage `[x]` when its commit lands. Keep this file as the single source of "what's
left" so a future session can resume without re-deriving the plan.

---

## Design decisions (locked)

| Decision | Choice |
|----------|--------|
| Taxonomy | **Fixed 7-emotion set** (not free text) → consistent calendar colors / trend stats |
| Emotions | 😊 기쁨 `joy` · ✨ 설렘 `excitement` · 🌿 평온 `calm` · 😮‍💨 지침 `tired` · 😢 슬픔 `sad` · 😰 불안 `anxious` · 😡 분노 `angry` |
| `score` | **Emotional intensity 0–100** (not valence) |
| Trigger | **Synchronous on save** (analyze → store before navigating to detail) |
| Keys vs labels | Stable English keys in DB/AI enum; Korean labels for UI |
| Failure mode | Best-effort — analysis never blocks/loses a save; entry is stored without emotion on failure |

Source of truth for the taxonomy is `src/lib/emotion.ts` (`EMOTIONS` / `EMOTION_META`).

---

## Stages

### ✅ 1. Data contract & storage layer
- [x] `lib/emotion.ts` — `EmotionPrimary` union (derived from `EMOTIONS`), `EMOTION_META`
      (label/emoji/color), `isEmotionPrimary` / `getEmotionMeta` guards
- [x] `types/diary.ts` — `DiaryEmotion.primary: EmotionPrimary`, `score` = 0–100 intensity
- [x] `lib/diaryMapper.ts` — pure `rowToDiary` / `diaryToRow` (no Supabase side effect, unit-testable);
      unknown/legacy primary → no emotion
- [x] `lib/diary.ts` — `updateDiaryEmotion(userId, date, emotion)` (targeted emotion-column update)
- [x] tests — taxonomy + mapper round-trip

### ✅ 2. AI analysis engine
- [x] `lib/emotionAnalysis.ts` — `analyzeEmotion(content, client?)`: OpenAI structured output
      (`json_schema`) constrained to the taxonomy; input truncation, timeout, retries; injectable client
- [x] `parseEmotionResponse()` — pure defensive validator (clamp score, filter/cap questions, reject bad payload)
- [x] best-effort fallback (returns `null`, never throws)
- [x] tests — validator + engine with a mocked client

### ✅ 3. Trigger integration (synchronous)
- [x] `lib/diary.ts` `analyzeAndStoreEmotion(userId, date, content)` — best-effort helper
      (`analyzeEmotion` → `updateDiaryEmotion`); never throws, shared by both routes
- [x] `api/diary` POST — after `saveDiary` succeeds, call the helper; returns `{ ok, emotion }`
- [x] `api/chat/summarize` — analyze the generated diary content in the same flow; returns `{ content, date, emotion }`
- [x] write screen UX — no change needed; the added `await` is covered by the existing "저장 중…" state (1–3s)
- [x] **decided: re-analyze on every save** — `saveDiary` upserts, so editing re-runs analysis and
      `updateDiaryEmotion` overwrites; emotion always reflects the latest content

### ⬜ 4. UI display
- [ ] detail page (`diary/[date]`) — emotion badge (color + emoji + label) + `summary` + reflection-question card
- [ ] calendar (`components/Calendar`) — replace the single-color dot with an **emotion-colored** dot (use `EMOTION_META[*].color`)
- [ ] list (`DiaryList`) — per-entry emotion indicator
- [ ] add emotion color tokens to `styles/variables.scss` (currently hardcoded in `EMOTION_META`)

### ⬜ 5. (later) Emotional trend retrospective
- [ ] monthly emotion distribution / flow visualization — follow-up PR; see PRODUCT_DIRECTION "open for later"

---

## Notes / open questions

- Calendar trend visualization shape (distribution bar? flow line?) is undecided → see PRODUCT_DIRECTION.
- `EMOTION_META` colors are placeholder warm-palette hexes; Stage 4 should reconcile them with the SCSS design tokens.
- Score semantics are "intensity of the primary emotion", not sentiment — keep this in mind for any future trend math.
