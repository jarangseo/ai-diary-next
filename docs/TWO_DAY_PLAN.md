# Two-Day Plan — v1 Streaming Thread Slice

> Created: 2026-08-19 · Status: **plan agreed, not started**
> Scope: a two-day sprint building the `docs/PRODUCT_DIRECTION.md` v1 direction as a
> **portfolio-grade React slice** — shippable product code, not a throwaway demo.

## Why this shape

The sprint has to satisfy three goals at once, and only the first is about features:

| Track | Deliverable | How it fails |
|---|---|---|
| Feature | a working streaming assistant thread | everyone's looks similar — this alone proves little |
| Measurement | before/after Web Vitals numbers | **batching it to the end loses the baseline forever** |
| Writing | decision log + a Vue→React comparison | written from memory in the last two hours, so it reads flat |

All three run **in parallel**. The plan is therefore built around one hard checkpoint:
**end of Day 1 = baseline frozen and tagged**, with zero optimization applied before it.

## Starting conditions (verified 2026-08-19)

- Next.js 16.1.6 · React 19.2.3 · Turbopack · pnpm
- `docs/PERFORMANCE.md` already documents a measurement dashboard and a June baseline
  (shipped JS **218 KB gzip**, TTFB 272ms / FCP 344ms / LCP 344ms)
- CI bundle budget gate at **250 KB gzip** (`check:bundle-budget`)
- `WebVitals` component logs values via `next/web-vitals` (values only, **no attribution**)
- `lib/emotion.ts` + `lib/emotionAnalysis.ts` exist and are tested; trigger wiring + UI remain
- `socket.io-client` ships in the bundle but v1 threads do not use it

Two consequences drive the plan:

1. **`docs/PERFORMANCE.md` states the app is "already fast (all green) because it has little data."**
   Without seeded data there is no baseline to improve. **Seeding is a prerequisite of the whole
   measurement track**, not a nice-to-have.
2. **218 KB used of a 250 KB budget.** Adding the AI SDK may breach the gate. Dropping/deferring
   `socket.io-client` offsets it — which turns a constraint into a measurable optimization item.

## Scope

**In** — chosen purely for interview value:

| Item | Why |
|---|---|
| Schema migration (`Diary` PK → `id`, `title`) | threads cannot attach to a `(user_id, date)` key; also the "stable design" requirement |
| Thread model + streaming UI | the core of the project |
| Generative UI (emotion analysis → card components mid-stream) | reuses existing `emotionAnalysis.ts`; the single best thing to show |
| Sidebar (server) / thread (client) | **the only justification for an RSC boundary story** |
| Seed + fake stream + measurement | required by the measurement track |

**Out** — and *writing down why* is part of the deliverable:

| Item | Reason |
|---|---|
| `Question` mode | doing both modes in two days means both end up half-done; the thread infra is identical, so it layers on later |
| Calendar dialog | pure UI work, no React story |
| Conversation branching · virtual scrolling | a full day each |

## Measurement design

### Which metrics actually move

A streaming chat UI only has two metrics worth contesting in two days:

| Metric | In this app | Priority |
|---|---|---|
| **INP** | typing in the composer while tokens stream — every token re-renders the list | 🟢 primary; largest delta, and the React story lives exactly here |
| **CLS** | text growing and tool cards appearing shift the layout | 🟢 secondary; same problem as scroll anchoring, so two for one |
| LCP / TTFB | barely move after first paint | 🟡 covered by the RSC/Suspense item |

### The benchmark must be deterministic

Real LLM streams vary in length and speed, so before/after numbers taken against a live model are
noise, not evidence. **All performance numbers are measured against the fake stream.** The real API
demonstrates that it works; it never produces a number.

Fixed scenario, recorded verbatim in `PERF.md`:

> production build · 60 seeded diary entries · 60 messages in the target thread ·
> fake stream of ~800 tokens at 20ms intervals with 2 tool-result cards ·
> typing in the composer for 5s starting 1s into the stream · median of 3 runs

The fake stream therefore does three jobs: de-risks Day 1 (UI completes without an API),
serves as a test fixture, and provides a reproducible benchmark.

### Instruments

| Target | Tool |
|---|---|
| INP | `web-vitals` **attribution build** — reports the element and the phase (input delay / processing / presentation) |
| CLS | same — reports which node shifted |
| LCP / TTFB / FCP | Lighthouse, production build |
| Re-render reality | React DevTools Profiler — commits per stream |
| JS size | `pnpm build && pnpm measure:bundle` |

Swap `WebVitals` to the attribution build on Day 1 morning (~5 min). **INP cannot be diagnosed from
the value alone**, and the whole of Optimization ① depends on knowing which phase absorbed the delay.

### Do not sandbag the baseline

Never write a deliberately slow first version to inflate the delta. Commit history is public and the
question "why did you write it that way?" has no good answer. The baseline must be
**what a senior engineer writes without thinking about performance** — streaming chat has poor INP
even when written correctly, so there is nothing to fake.

---

## Day 1 — skeleton and baseline (no optimization)

| Time | Task | Check |
|---|---|---|
| 09:00–09:30 | branch; attempt Next 16.1.6 → 16.3 upgrade (**30 min timebox**) | roll back immediately if the build breaks — not worth risking the sprint |
| 09:30–11:30 | **schema migration**: `Diary` PK → `id`, `date` indexed, `title` added; `threads`/`messages` tables; `lib/diary.ts` create/update split; `/diary/[date]` → `/diary/[id]` | `pnpm typecheck` + `pnpm test:run` green; first `DECISIONS.md` entry |
| 11:30–12:00 | **seed script** — 60 entries with varied emotions + 60 messages in one thread | ⚠️ never skip: every afternoon number depends on it |
| 13:00–14:00 | **fake stream + frozen benchmark scenario** | scenario written into `PERF.md` |
| 14:00–16:00 | **thread UI** — streaming render, optimistic user message, abort/regenerate | completed with no API involved |
| 16:00–17:30 | **generative UI** — analysis results injected mid-stream as card components | reuse `lib/emotionAnalysis.ts` |
| 17:30–18:30 | **RSC boundary** — sidebar/history as server components + Suspense; only the thread is client | `DECISIONS.md`: where the line went and why |
| 19:30–20:30 | **sidebar list** — `[emotion icon] title`, date group headers | titles come from the seed; AI titling is a Day 2 concern |
| **20:30–21:00** | 🔴 **baseline** — production build → 3 runs → median → record in `PERF.md` → tag **`perf/baseline`** | the most important 30 minutes of the sprint; if it slips, the measurement track is gone |

**Rule for Day 1: resist optimizing.** Not one `useMemo`.

## Day 2 — real API, optimization, re-measurement, writing

| Time | Task | Check |
|---|---|---|
| 09:00–10:30 | **wire the real AI SDK** (streaming + tool call → emotion cards) | ⏱ **hard stop at 11:00.** If it is not working, keep the fake stream, record why, move on — the demo still runs |
| 10:30–11:00 | **bundle budget** — measure the AI SDK's cost, offset by deferring/removing `socket.io-client` | before/after KB; stay under the 250 KB gate |
| 11:00–12:00 | 🔵 **Optimization ① INP** — split the streaming message out of the list; transitions / `useDeferredValue` | **re-measure immediately** |
| 13:00–14:00 | 🔵 **Optimization ② CLS** — reserve space for cards; scroll anchoring via `useEffectEvent` | re-measure immediately |
| 14:00–15:00 | 🔵 **Optimization ③ LCP/TTFB** — Suspense-stream the history, prefetching | re-measure immediately |
| 15:00–15:30 | tag **`perf/optimized`**; complete the `PERF.md` table | |
| 15:30–16:30 | **deploy + demo mode** (see risks) | a link that survives a 1 a.m. click |
| 16:30–17:00 | 90-second demo recording | top of the README |
| 17:00–19:00 | **the three documents** — `DECISIONS.md`, `PERF.md`, `VUE-TO-REACT.md` | do not spend this slot on code |
| 19:00–20:00 | README + buffer | |

Re-measure after **each** optimization, never in one batch at the end — otherwise no individual
change can be attributed to a number.

---

## Vue → React pairings (fill in while working, not afterwards)

| # | Symptom | Cause | React answer | In Vue |
|---|---|---|---|---|
| 1 | composer lag while streaming (INP) | every token re-renders the message list | split the streaming message out; transitions / `useDeferredValue` mark work as non-urgent | fine-grained reactivity means **this mostly does not happen** — appending a token touches that text node only |
| 2 | layout jump when a tool card lands (CLS) | a component of unknown height is inserted mid-stream | reserve space + scroll anchoring | identical — **write "no difference" honestly**; this is not a framework problem |
| 3 | the view yanks down while the user is scrolled up | scroll logic needs the latest state without re-subscribing | `useEffectEvent` — separating reactive from non-reactive logic inside an effect | `watch`'s explicit dependencies make the distinction less necessary; React makes "when does this re-run" visible in the code |
| 4 | slow initial history load (LCP/TTFB) | client fetches, then renders | server components + Suspense streaming | Nuxt can do this **per page, not per component** — the strongest genuine differentiator |
| 5 | bundle size | everything is a client component | shrink the client component surface | Nuxt has hydration strategies, but a different model |

Row 1 must concede that Vue simply wins by default. The sentence worth landing:

> Vue tracks what changed and updates only that. React re-renders and reconciles. Vue gets this for
> free — but has no way to express "this update is urgent and that one is not." React created the
> problem and handed over the means to express it. In a streaming UI, that expressiveness was needed.

## Risks and standing rules

- **The interviewer cannot log in.** `middleware.ts` gates `/diary`, so a shared link hits a Google
  login wall. A **read-only public demo route backed by seed data** is required (15:30 slot).
  Bonus: Lighthouse CI can finally start from a real route instead of `/login`.
- **A dead link is worse than no link.** Keep a demo mode that replays the fake stream when the API
  key is missing or over quota, so the deployed page never breaks.
- **Real-API failure is contained.** Day 2 09:00–10:30 is the only slot at risk; the fake stream keeps
  Day 1's output demoable regardless.
- **Company-asset framing.** What is being rebuilt is the *problem class* (abort, rollback, scroll,
  tool-result rendering), not a recognizable internal product. Set that tone in the README's first paragraph.
- **`useOptimistic` may end up unused** if the SDK's hook already handles optimistic appends. Either
  apply it to a different action (edit, regenerate, fold-into-entry) or do not claim it — and say why not.

## Measurement table template

```
Conditions: production build / 60 entries / 60 messages in thread /
            fake stream 800 tokens @20ms / typing 5s starting 1s into the stream / median of 3

| Metric   | baseline | opt ① | opt ② | opt ③ | cause |
|----------|----------|-------|-------|-------|-------|
| INP      |          |       |       |       |       |
| CLS      |          |       |       |       |       |
| LCP      |          |       |       |       |       |
| TTFB     |          |       |       |       |       |
| JS gzip  | 218 KB   |       |       |       |       |
| commits  |          |       |       |       |       |
```

## Prep the night before (10 min each)

1. Draft the Supabase migration SQL (PK change + new tables) — paste-ready in the morning
2. Install `ai` / `@ai-sdk/react` and run one build — knowing the bundle delta removes all uncertainty from Day 2's 10:30 slot
3. Check whether the Next 16.3 upgrade is viable (`pnpm outdated`, release notes) — may remove the morning timebox entirely

## Deliverables

- `perf/baseline` and `perf/optimized` tags — the numbers are verifiable from the diff
- `DECISIONS.md` — three lines per decision (chose / rejected / why), written **as it happens**
- `PERF.md` — conditions, before/after table, cause analysis per optimization
- `VUE-TO-REACT.md` — the table above with one sentence of personal experience per row
- A deployed link with a public demo route and a 90-second recording at the top of the README
