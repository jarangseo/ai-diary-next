# Plan — toward a link worth sharing

Working queue for the loop (see [`HARNESS.md`](./HARNESS.md)). One item at a time; tick
only after `pnpm verify` passes.

**Context:** the app will be posted on a personal SNS account, so strangers will use it.
That makes spend caps and a data-handling notice requirements, not polish.

## Delegable

- [x] **1. Remove the lab route.**
      Delete `/diary/thread-lab` and the unused `useThread.ts` practice hook. The seeded
      rows are already gone from the database (done by hand — writes there are outside the
      loop's remit).
      *Done when:* `grep -rE "thread-lab|useThread\b" src/` returns nothing and `pnpm verify`
      passes. (The word boundary matters — a bare `useThread` also matches the real
      `useThreadStream`, so the check could never have passed as first written.)

- [ ] **2. Put the thread on the diary detail page.**
      Create a thread when an entry is saved; render `ThreadPanel` beside the entry.
      *Done when:* `test.fixme` is removed from `e2e/thread.spec.ts` and it passes.

- [ ] **3. Connect the real model.**
      Stream text from OpenAI through the existing `StreamPart` protocol; emit the
      emotion card from the existing `analyzeEmotion` once the text completes. `?bench=1`
      must keep serving the deterministic stream — the performance numbers depend on it.
      *Done when:* the route branches on `bench`, and E2E still passes against the fake path.

- [ ] **4. Spend caps.**
      Per-user daily request limit; over it, fall back to the fake stream with an honest
      notice rather than an error.
      *Done when:* a unit test asserts the N+1th request is refused.

- [ ] **5. Fix `pnpm seed --clean`.**
      It deletes a window computed from *today*, not the rows it created, so cleaning on a
      later day than seeding leaves the earliest entries behind (five survived a clean on
      2026-08-24 after seeding on 08-19). Seeded rows carry a `title` and hand-written ones
      do not, which is the discriminator to use.
      *Done when:* a unit test covers cleaning with an `--end` different from the seed date.

- [ ] **6. Stop blocking saves on emotion analysis.**
      `POST /api/diary` awaits an OpenAI call before responding, so every save waits on a
      model. Move it after the response.
      *Done when:* the save assertion in `e2e/diary.spec.ts` passes without its 20s timeout.

## Needs a person

- [ ] **7. Landing page.** `/` redirects into a login wall; a visitor cannot tell what this is.
- [ ] **8. Privacy notice.** Diaries are sensitive personal data and OAuth collects account
      identity. What is stored, that entries are sent to OpenAI, and how to delete them.
- [ ] **9. Deploy and smoke test**, including mobile.

## Known debt, not scheduled

- `/diary/[date]` returns 406 on dates holding more than one entry — no longer reachable now the seed is gone; the real fix is id-based routing.
- `?bench=1` is documented in the messages route but does not branch yet (item 3).
- Settings page is a placeholder.
