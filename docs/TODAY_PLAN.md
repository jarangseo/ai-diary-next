# Plan — toward a link worth sharing

Working queue for the loop (see [`HARNESS.md`](./HARNESS.md)). One item at a time; tick
only after `pnpm verify` passes.

**Context:** the app will be posted on a personal SNS account, so strangers will use it.
That makes spend caps and a data-handling notice requirements, not polish.

## Delegable

- [x] **1. Remove the lab route.**
      Delete `/diary/thread-lab` and the unused `useThread.ts` practice hook.
      *Done when:* `grep -rE "thread-lab|useThread\b" src/` returns nothing and `pnpm verify`
      passes. (The word boundary matters — a bare `useThread` also matches the real
      `useThreadStream`, so the check could never have passed as first written.)

- [x] **2. Put the thread on the diary detail page.**
      Create a thread when an entry is saved; render `ThreadPanel` beside the entry.
      *Done when:* `test.fixme` is removed from `e2e/thread.spec.ts` and it passes.

- [x] **3. Connect the real model.**
      Stream text from OpenAI through the existing `StreamPart` protocol; emit the emotion
      card from the existing `analyzeEmotion` once the text completes. `?bench=1` must keep
      serving the deterministic stream — the performance numbers depend on it.
      *Done when:* the route branches on `bench`, and E2E still passes against the fake path.

- [x] **4. Spend caps.**
      Per-user daily request limit; over it, fall back to the fake stream with an honest
      notice rather than an error.
      *Done when:* a unit test asserts the N+1th request is refused.

- [x] **5. Deletion and account withdrawal.**
      A privacy notice cannot say "you can delete your entries" while that is false, and
      "kept until withdrawal" is not a retention period if withdrawal does not exist.
      *Done when:* an E2E writes an entry, deletes it, and finds it gone after a reload —
      and a second one withdraws and finds no rows left for that user.

- [x] **6. Stop blocking saves on emotion analysis.**
      `POST /api/diary` awaits an OpenAI call before responding, so every save waits on a
      model. Move it after the response.
      *Done when:* the save assertion in `e2e/diary.spec.ts` passes without its 20s timeout.

- [x] **7. Fix `pnpm seed --clean`.**
      It deleted a window computed from *today* rather than the rows it created, so cleaning
      on a later day than seeding stranded the earliest entries.
      *Done when:* a unit test covers cleaning with an `--end` different from the seed date.

- [ ] **8. Run the E2E suite in CI.**
      The safety net only exists on one laptop. CI runs typecheck, unit tests, lint and
      format — every one of which stayed green through both bugs the E2E caught this week
      (the write page erasing typed text, and the thread test racing persistence), because
      none of them opens a browser. A pull request can break the feature and CI will say it
      is fine.

      The obstacle is credentials: `test:e2e` needs Supabase and the workflow has none. The
      fix worth doing is a **separate Supabase project for development and CI**, which is
      also the answer to developing against the production database — the seeding accident
      on 2026-08-19 came from exactly that. Then `SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY` and `E2E_AUTH_SECRET` go in GitHub Secrets and the verify
      job gains `pnpm build && pnpm test:e2e`.

      `E2E_AUTH_SECRET` is what makes the test sign-in provider exist at all. It must be a
      CI-only secret and must never reach the Vercel environment, where it would be account
      takeover.

      *Done when:* a PR that breaks a user-visible flow fails CI. Worth proving by
      deliberately breaking one and watching it go red before trusting it.

## Needs a person

- [ ] **9. Landing page.** `/` redirects into a login wall; a visitor cannot tell what this
      is.

- [ ] **10. Terms and privacy notice.** The login screen already states *"By continuing,
      you agree to our Terms of Service"* — and no such document exists, which is worse than
      saying nothing. Needs `/terms` and `/privacy`, the login line turned into real links,
      and a consent checkbox at sign-up.

      Entry text is sent to OpenAI in full, and an emotion analysis is data about someone's
      mental state — closer to sensitive personal data than to ordinary account data. Say so
      where people will see it (sign-up and the writing screen), not only inside the policy.
      The parts only a person can fill are the service name, the privacy officer's contact,
      and the age floor.

- [ ] **11. Deploy and smoke test**, including mobile.

- [ ] **12. Exercise the live model by hand.** `modelParts` is covered by unit tests with an
      injected client, but no request has ever been sent to OpenAI — the loop was told not to
      spend money. Nothing automated can close this one.

## Known debt, not scheduled

- Withdrawal is two deletes and PostgREST has no transaction across them, so a failure
  between diaries and standalone threads leaves the latter behind. Both are idempotent,
  so a retry is safe, but nothing retries automatically.

- The daily cap is per account, and accounts are free to create — someone determined
  spends 20 replies per Google account. A per-IP or global daily ceiling is the next layer
  if the link travels further than expected.

- **The live model path has never actually run.** `modelParts` is covered by unit tests
  with an injected client, so the chunk-to-StreamPart transformation is verified, but no
  request has been sent to OpenAI — deliberately, to keep the loop from spending money.
  Exercise it by hand once before launch.

- The detail page makes three sequential round trips (entry → thread → messages), each
  genuinely needing the previous one's id. One embedded read
  (`diaries?select=*,threads(*,messages(*))`) would collapse them, at the cost of not
  being able to express "create the thread if absent" — so it helps the common case only.
  Round trips cost ~250ms each here (docs/STREAMING_PERF.md).

- `/diary/[date]` returns 406 on dates holding more than one entry — no longer reachable now the seed is gone; the real fix is id-based routing.
- `?bench=1` is documented in the messages route but does not branch yet (item 3).
- Settings page is a placeholder.
