# Plan — toward a link worth sharing

Working queue for the loop (see [`HARNESS.md`](./HARNESS.md)). One item at a time; tick
only after `pnpm verify` passes.

**Context:** the app will be posted on a personal SNS account, so strangers will use it.
That makes spend caps and a data-handling notice requirements, not polish.

## Delegable
- [ ] **1. Remove the lab route.**
      Delete `/diary/thread-lab` and the unused `useThread.ts` practice hook. The seeded
      rows are already gone from the database (done by hand — writes there are outside the
      loop's remit).
      *Done when:* `grep -r "thread-lab\|useThread" src/` returns nothing and `pnpm verify` passes.


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


- [ ] **5. Deletion and account withdrawal.**
      There is a `deleteDiary` in `lib/` and nothing reaches it — no route, no button. A
      privacy notice cannot say "you can delete your entries" while that is false, and
      "kept until withdrawal" is not a retention period if withdrawal does not exist.
      Deleting an entry should take its thread and messages with it (the foreign keys
      already cascade); withdrawal should remove every row for the user.
      *Done when:* an E2E writes an entry, deletes it, and finds it gone after a reload —
      and a second one withdraws and finds no rows left for that user.

- [ ] **6. Stop blocking saves on emotion analysis.**
      `POST /api/diary` awaits an OpenAI call before responding, so every save waits on a
      model. Move it after the response.
      *Done when:* the save assertion in `e2e/diary.spec.ts` passes without its 20s timeout.


- [ ] **7. Fix `pnpm seed --clean`.**
      It deletes a window computed from *today*, not the rows it created, so cleaning on a
      later day than seeding leaves the earliest entries behind (five survived a clean on
      2026-08-24 after seeding on 08-19). Seeded rows carry a `title` and hand-written ones
      do not, which is the discriminator to use.
      *Done when:* a unit test covers cleaning with an `--end` different from the seed date.


## Needs a person
- [ ] **8. Landing page.** `/` redirects into a login wall; a visitor cannot tell what this is.

- [ ] **9. Terms and privacy notice.** The login screen already states *"By continuing,
      you agree to our Terms of Service"* — and no such document exists, which is worse
      than saying nothing. Needs `/terms` and `/privacy`, the login line turned into real
      links, and a consent checkbox at sign-up.

      Entry text is sent to OpenAI in full, and an emotion analysis is data about someone's
      mental state — closer to sensitive personal data than to ordinary account data. Say
      so where people will see it (sign-up and the writing screen), not only inside the
      policy. The checklist of required sections is in the conversation that produced this
      item; the parts only a person can fill are the service name, the privacy officer's
      contact, and the age floor.

- [ ] **10. Deploy and smoke test**, including mobile.

## Known debt, not scheduled

- `/diary/[date]` returns 406 on dates holding more than one entry — no longer reachable now the seed is gone; the real fix is id-based routing.
- `?bench=1` is documented in the messages route but does not branch yet (item 3).
- Settings page is a placeholder.
