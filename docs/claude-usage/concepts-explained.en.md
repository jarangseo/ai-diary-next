# Working with Claude Code — Concepts & Engineering Notes

> Written: 2026-06-02 · Companions: [assessment.md](./assessment.md) · [roadmap.md](./roadmap.md)
> Purpose: plain-language notes on the "working with Claude Code" approach established in this project.
> Korean version: [concepts-explained.md](./concepts-explained.md)

---

## 0. The one-liner

> **"Using Claude well" isn't hoping the model is flawless — it's building safety nets that
> automatically catch mistakes, so you can delegate more and trust it more.**

Move verification out of *a person's memory* and into *a system*. That's the core principle.

---

## 1. As-Is → To-Be

| | As-Is (start) | To-Be (goal) |
|---|---|---|
| Verification | a human remembers to run tests → forgets | the system checks automatically |
| Code review | meant to, but skipped it | a bot auto-reviews every PR |
| Mistakes | only caught by human eyes | filtered automatically first |
| Delegation | one-off "write this code" | delegate big, on top of a safety net |
| Analogy | careful driving, no seatbelt | a car with seatbelt + auto-brake |

---

## 2. Building-block glossary (with analogies)

| Term | One-line analogy | In this project |
|------|------------------|-----------------|
| **CI** | the automated inspection station at the end of a factory line | `ci.yml` — auto-checks lint/types/tests on every PR; red light if it fails |
| **Review bot** | an auto-proofreading teacher | `claude-code-review.yml` — AI reads the code and leaves comments on every PR |
| **Hook** | an automatic-door sensor / door lock | runs automatically at a moment (e.g. test before commit, block commits to main) — not built yet |
| **Permission allowlist** | the security desk's "free-pass list" | commands that run without asking; risky ones still prompt (`ask`) |
| **PR (pull request)** | a proposal: "OK to merge this?" | where CI and the bot attach to review |
| **Merge** | folding the proposal into the trunk (main) | joins after checks pass |
| **Dogfooding** | the owner eats their own cooking first | ran the bot we built on our own code → found & fixed a config flaw |
| **DoD (Definition of Done)** | the checklist for "this is actually finished" | implement → test → verify → review → merge |

**Deterministic vs non-deterministic** (key): CI checks (a machine: ruler & scale) give the same
result for the same code, every time. The review bot (a human-like AI) gives slightly different
opinions each run. So a bot "pass" is *advice*, not a *fact*.

---

## 3. Design questions & answers (why it was built this way)

> Real questions hit during the work, with the reasoning. Each item = question → core answer → why it matters.

### Q1. A CI gate is just a GitHub safety feature — how does it improve "Claude utilization"?
- **A**: CI makes you robust to *Claude's non-determinism*. It turns "remember to verify" into "the system verifies."
- **Why it matters**: the more you delegate to AI (the less you hand-review), the more an automatic net is worth. CI is what lets you delegate *with confidence* — that *is* utilization.

### Q2. If the bot says "pass," is that just a pass?
- **A**: No. A bot pass = "the bot ran and left no comments" (a weak signal), not "guaranteed bug-free."
- **Why it matters**: the real gate is the *deterministic CI (tests/typecheck)* + a human. The bot is a second pair of eyes, not an authority.

### Q3. Isn't the bot also part of CI?
- **A**: Broadly, yes (same GitHub Actions, runs per PR). But its *nature* differs — CI checks = machine (deterministic, a gate); the bot = AI (advisory).
- **Why it matters**: "same infrastructure ≠ same trust level." Don't treat all automation as equally authoritative.

### Q4. Doesn't hook-based checking overlap with CI checking?
- **A**: A test hook *does* overlap with CI — the difference is *when/where* (hook = local & instant, CI = remote & later). The hook is fast early-warning; CI is the un-skippable final gate ("shift-left").
- **The twist**: so the *overlapping* hook (tests) only adds speed → low priority; the *non-overlapping* hook (block commits to main) is the real value — CI runs *after* the commit, so only a hook can stop the commit itself.

### Q5. What is permission-allowlist curation?
- **A**: Delete the 21 one-off permissions that accumulated during a session; compress safe/frequent ones into patterns (auto-run); intercept risky variants (force push, etc.) with `ask` (always confirm).
- **Why it matters**: precedence `deny > ask > allow` → `git push *` is automatic, but `git push --force*` is intercepted. Balances "more convenience + still safe."

### Q6. (Meta) Why invest in all this automation?
- **A**: Discipline + an automatic safety net drives most of the quality difference — more than clever prompts. It's applying solid engineering discipline (small PRs, tests-first, review) to AI-assisted work.

---

## 4. Progress timeline (what was done)

1. **Diagnose** — Claude utilization at B+ (good discipline, but no automatic safety nets).
2. **CI gate (T1)** — auto typecheck/test/lint on every PR.
3. **Review bot (T3)** — AI auto-review per PR. While *dogfooding*, found that the cost cap
   (`--max-turns 10`) was killing the whole review → raised to 40; measured ≈ $1.20 per review.
4. **Permission cleanup (T5)** — allowlist from 21 one-offs → 17 patterns + 7 `ask` guards.
5. **Real feature** — built emotion analysis (data layer + AI engine) on top of the new net, and merged it.
6. **Remaining** — verification hooks (T2: auto-check before commit + block commits to main),
   CLAUDE.md gap-filling (T4), subagent cross-review (T6).

**Where it stands now**: the big nets (auto-checks + auto-review + permission cleanup) are done;
what's left is making them finer-grained.

---

## 5. Summary (one sentence)

> The key to using AI coding well isn't expecting the model to be perfect — it's building safety nets
> (CI, a review bot, hooks) that catch mistakes automatically so you can delegate more; while adding
> the review bot we dogfooded it and caught a cost-config flaw, and worked with a clear trust
> distinction: a "bot pass" is just advice, unlike the deterministic CI or a human's judgment.
