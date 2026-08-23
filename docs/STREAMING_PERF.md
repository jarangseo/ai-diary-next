# Streaming thread — baseline and findings

> Measured 2026-08-19 · Commit tagged `perf/baseline`
> Companion to [`PERFORMANCE.md`](./PERFORMANCE.md), which covers the app's overall
> performance budget. This file covers one surface: the streaming conversation thread.

## What is being measured, and why it is measurable at all

A live model varies in reply length and pace, so before/after numbers taken against one
measure the weather rather than the code. Every number here comes from
[`src/lib/fakeStream.ts`](../src/lib/fakeStream.ts) instead: a fixed 800 text deltas at
20 ms with two tool results at fixed positions, asserted in tests to be byte-identical
run to run. The real model demonstrates that it works; it never produces a number.

Data comes from `pnpm seed`, which is deterministic for the same reason — 60 entries and
a 60-message thread, identical on every run.

### Conditions

- production build (`pnpm build && pnpm start`), Chrome, Apple silicon
- 72–76 messages in the thread (the seed's 60, plus messages from earlier runs)
- reply streamed from the fake source; typing in the composer for ~5 s starting ~1 s in
- the tab stays foregrounded and focused for the whole run — a backgrounded tab makes
  Chrome throttle timers and suppresses FCP/LCP reporting entirely (verified: a hidden
  tab reported `first-contentful-paint` at 5496 ms and no LCP at all)
- values read from the `[web-vitals]` console output, which uses the **attribution**
  build; for INP and CLS the last reported value is the one recorded
- 3 runs

## Baseline

| Metric | Run 1 | Run 2 | Run 3 | Median | Rating |
| --- | ---: | ---: | ---: | ---: | --- |
| **INP** | 56 ms | 48 ms | 48 ms | **48 ms** | good (≤200) |
| ├ input delay | 1 | 5 | 1 | 1 | |
| ├ processing | 14 | 2 | 5 | 5 | |
| └ **presentation** | 40 | 40 | 42 | **40** | **83 % of INP** |
| **TTFB** | 402 ms | 1061 ms | 1122 ms | **1061 ms** | needs-improvement (>800) |
| **LCP** | 692 ms | 1376 ms | 1396 ms | **1376 ms** | good (≤2500) |
| **FCP** | 692 ms | 1376 ms | 1396 ms | 1376 ms | good |
| **CLS** | 0.002 | 0.004 | 0.005 | **0.004** | good (≤0.1) |
| Shipped JS | — | — | — | 226.6 KB gzip | budget 250 KB |

React DevTools Profiler, same scenario: **860 commits**, **0.7 ms render per commit**, of
which `ThreadPanel` itself is 0.6 ms. Everything above it in the tree — router,
providers, layout — is grey, i.e. never re-rendered.

## Findings

### 1. React was not the bottleneck, and the assumption that it would be was wrong

The hook rebuilds the whole messages array on every token, which was expected to
re-render all ~70 messages ~50 times a second and wreck INP. It does not.

Two independent instruments agree on where the time is **not**:

| Instrument | Reading | Meaning |
| --- | --- | --- |
| Profiler | 0.7 ms per commit | React work |
| web-vitals | `processing: 5 ms` | React work |
| web-vitals | `presentation: 40 ms` | browser style/layout/paint |

860 commits × 0.7 ms ≈ 0.6 s of React work across a 16-second stream — about 4 % of it.

Two reasons. React Compiler (already enabled in `next.config.ts`) memoizes the list items:
`map` produces a new array but only the changed message is a new object, so the other ~70
keep their references and their subtrees are skipped — `ThreadPanel` accounts for 0.6 ms
of the 0.7 ms, meaning its children cost almost nothing. And the per-message work is
trivial to begin with: a div and some text, no markdown, no highlighting, no formatting.

**This finding is only visible with the attribution build.** A bare "INP = 48 ms (good)"
would have ended the investigation with the wrong conclusion intact.

### 2. The cost is layout, and it grows with the message

Time sits in `presentation` — the browser re-flowing a `pre-wrap` block that gets longer
every 20 ms. It scales with the length of the message being streamed:

| Typing at | presentation | INP |
| --- | ---: | ---: |
| ~1 s into the stream | 34 ms | 40 ms |
| ~14 s into the stream | 91 ms | 96 ms |

Same code, same machine, 2.7× apart. The baseline scenario above types early, so it
captures the cheap end of that range — a limitation of the protocol, recorded rather than
hidden.

### 3. LCP is server time, not render time

```
LCP 1376 ms
 ├─ TTFB               1122 ms   (77 %)
 └─ elementRenderDelay    27 ms
```

The browser needs 27 ms. The page component awaits auth, two DB round trips to Supabase,
and renders ~75 messages before the first byte leaves. This is the one metric outside its
threshold.

### 4. CLS has a single, fully attributed cause

All three runs name the same node: `div.ThreadPanel__card`. The emotion card appears
mid-stream and pushes content below it. The value is small (0.004) because the card is
small and appears twice, but the cause is specific and the fix is to reserve its space.

## Decisions

**Do not optimise INP.** It is 48 ms against a 200 ms threshold. Rewriting the state
strategy to shave a 5 ms `processing` figure would be optimisation theatre, and the
naive-looking `map` is not costing what it appears to cost. Recorded instead: the
measured relationship between message length and presentation cost, which is the thing
that would actually bite at scale — and on a slower device, where these numbers land
3–5× higher.

**Fix TTFB.** Largest number, furthest outside threshold, and it drags LCP with it. The
shell can be streamed before the messages resolve.

**Fix the card's layout shift.** Small, but the cause is unambiguous and reserving space
is cheap.

## Limitations of this baseline — read before trusting it

- **3 runs.** Enough to see that `presentation` dominates consistently; not enough for
  TTFB, which spread 402–1122 ms because it includes a network round trip to a hosted
  database.
- **CPU throttling status is uncertain.** These numbers came out *lower* than an earlier
  unthrottled run (48 ms vs 96 ms), which is the opposite of what 4× slowdown should do —
  the difference is explained by typing earlier in the stream (see finding 2), but it
  means throttling cannot be assumed to have been active. Re-run with it confirmed before
  quoting these as representative-device numbers.
- **Few interactions per run.** INP is the worst of all interactions; only 2–4 were
  captured per run, so the tail is under-sampled.
- **Apple silicon.** Real-user numbers will be several times worse.
