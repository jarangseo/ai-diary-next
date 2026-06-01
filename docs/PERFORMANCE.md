# Performance & Resilience Defense TODO

> Created: 2026-05-31 · Status: **in progress**

**Framing**: "perfect performance" is not a state but a *budget that is kept*.
Real defense is not "make it fast" — it's **stopping each layer from slowing down or breaking, and watching for regressions**.

Tags: `[GAP]` = a real hole today / `[GUARD]` = proactive defense

Work is split into the 4 bundles below and committed bundle-by-bundle (to keep PRs small and regressions easy to verify). Bundles = Task #5–#8.

---

## Measurement infra & baseline  (Task #8 — priority 0)

> **Optimizing without measuring is premature optimization.** A change is only justified if *a number moved*.
> Below is our "dashboard" and starting numbers.

### Dashboard
| Metric | Tool | How to read |
|--------|------|-------------|
| Runtime LCP/INP/CLS/FCP/TTFB | `WebVitals` component (`next/web-vitals`) | `[web-vitals]` logs in the browser console (in production: send to a RUM endpoint) |
| Shipped JS bundle size | `pnpm build && pnpm measure:bundle` | gzip KB — compare before/after a change |
| Lighthouse score/opportunities | Chrome DevTools → Lighthouse tab (or `npx lighthouse`) | LCP·TBT·CLS + improvement suggestions |

> ⚠️ Unlike webpack, the Turbopack build does not print a per-route First Load JS table → use `measure:bundle` instead.

### Baseline (2026-06-01, with instrumentation included)
- **Shipped JS**: 707 KB raw / **218 KB gzip** (includes +3 KB for Web Vitals instrumentation)
- **Largest chunk**: 219 KB (framework/react), then 110 KB · 108 KB
- **Runtime Web Vitals (production `pnpm build && pnpm start`)**: all good
  - TTFB **272ms** / FCP **344ms** / LCP **344ms** / FID **5ms**
  - Note: in dev mode these inflate to TTFB 2067ms / FCP 2144ms (on-demand compilation) → always measure in production.

> ⚠️ **The app is already fast (all green)** because it has little data. Gaps like `select *` only
> surface as data grows, so the goal of this work is *preventing future degradation + learning how to detect it*.

### Console noise observed (at baseline)
- `GET /api/diary/<date> 404` — the write screen's prefill legitimately receives "no existing entry",
  but the 404 shows up as a console error → candidate to have the API return 200+null instead (resilience bundle).
- `...css was preloaded but not used` — a Next preload characteristic, usually harmless.

For each bundle applied, record the relevant metric's **before → after** in this doc.

### CI budget gate (installed — shift left)
- `.github/workflows/bundle-budget.yml`: every PR runs build → `check:bundle-budget`, **fails if gzip JS > 250KB**.
- `scripts/check-bundle-budget.mjs` (`pnpm check:bundle-budget`): same check locally. Adjust the budget via `BUNDLE_BUDGET_KB`.
- Build env uses dummy values in the workflow (only bundle size is measured, so no real secrets needed).
- Limitation/next: Lighthouse CI must start from a public route (`/login`) because of the auth gate (not installed yet).

### RUM (monitor right) — next step
- The app is **deployed on Vercel** → `@vercel/speed-insights` can wire up a real-user Web Vitals dashboard in one line (not installed yet).
- `WebVitals` is currently at the console-log stage. Promoting it to Vercel Speed Insights completes production RUM.

---

## Bundle A — P0 core defenses  (Task #5)

The most urgent things that actually block real-world operation.

- [ ] **Data pagination** `[GAP]` — remove `getAllDiaries` (full `select *`, no LIMIT)
  - `getDiaryDates(userId)`: only `date, emotion_primary` (for calendar dots, lightweight + safe cap)
  - `getRecentDiaries(userId, {limit, before})`: cursor-based (date), explicit columns
  - add `GET /api/diary?before=&limit=` → list "load more"/infinite scroll
  - `src/lib/diary.ts`, `src/app/diary/page.tsx`, `DiaryHome`, `DiaryList`
- [ ] **fetch defense wrapper** `[GAP]` — `lib/http.ts`: timeout + `AbortController` + exponential-backoff retry
  - apply in `services/chatServices.ts`, write save, summarize call
- [ ] **OpenAI call defense** `[GAP]` — `api/chat/summarize`
  - input length/token cap (truncate long conversations), client `timeout` + `maxRetries`
  - try/catch + graceful fallback response
- [ ] **React Query defaults** `[GAP]` — `Provider.tsx`
  - `staleTime`(5m) / `gcTime`(10m) / `retry`(1) / `refetchOnWindowFocus:false`
- [ ] **DB indexes** `[GUARD]` — Supabase SQL (outside the app, provided as a migration)
  - `(user_id, date)`, `(user_id, updated_at desc)`

## Bundle B — assets & rendering  (Task #6)

Improve FCP/LCP and initial load.

- [ ] **Migrate fonts to next/font** `[GAP]` — currently render-blocking `@import`
  - Gowun Batang → `next/font/google`
  - Pretendard → `next/font/local` (self-hosted) or preconnect+preload optimization
    (note: Pretendard is not available on `next/font/google`)
  - `display:swap` · subset · preload
- [ ] **Suspense streaming + skeleton** `[GAP]` — remove `getAllDiaries`/data blocking
  - `src/app/diary/loading.tsx`, move data fetch behind a Suspense boundary
- [ ] **API Cache-Control headers** `[GAP]` — GET routes (private, short max-age)
  - invalidate via RSC `revalidateTag`/`unstable_cache` on save
- [ ] **Image & code splitting** `[GUARD]`
  - avatar `next/image` `sizes`/appropriate loading
  - split chat·socket code out of the main bundle via `dynamic import`

## Bundle C — resilience (error/loading)  (Task #7)

- [ ] **Per-route error/loading** `[GAP]` — currently only chat has `error.tsx`
  - `src/app/diary/error.tsx`, `loading.tsx`, global `global-error.tsx`
- [ ] **server-only guard** `[GUARD]` — `import 'server-only'`
  - keep `lib/supabase.ts` (service-role key), `lib/diary.ts`, `lib/chat.ts` out of the client bundle
- [ ] **Input validation** `[GUARD]` — validate API input with `zod` + payload size limit
  - `api/diary`(POST), `api/chat/summarize`, etc.
- [ ] **State UI & toasts** `[GUARD]` — empty/error/offline state UI, dedupe toasts (same id)

## Bundle D — measurement & budget  (Task #8)

Without this you cannot prove or maintain "perfect".

- [ ] **Web Vitals (RUM)** `[GAP]` — collect real LCP/INP/CLS via `useReportWebVitals`
- [ ] **Bundle budget** `[GUARD]` — `@next/bundle-analyzer` + size limit in CI
- [ ] **Lighthouse CI** `[GUARD]` — score gate per PR (block regressions)

---

## Deferred (separate bundle — chat / large-data stage)

Chat is deferred by product decision (→ [PRODUCT_DIRECTION](./PRODUCT_DIRECTION.md)), so its defenses are deferred too.

- Realtime (socket): explicit reconnection backoff, disconnect on tab hidden (`visibilitychange`), virtualize the message list `[GUARD]`
- Middleware **rate limiting** `[GUARD]`
- Perceived performance: **optimistic UI** on save, **virtual scrolling** for large lists `[GUARD]`
