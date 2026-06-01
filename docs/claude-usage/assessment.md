# Claude Code 활용도 검토 (진단)

> 작성: 2026-06-01 · 대상: 감정 분석 Stage 1·2 + docs/typecheck 작업 세션
> 짝 문서: [roadmap.md](./roadmap.md) — B+ → A+ 개선 로드맵

이 프로젝트의 진짜 목적은 **나의 Claude Code 활용 역량을 높이는 것**이다.
그래서 "코드가 잘 나왔나"가 아니라 **"Claude를 잘 부렸나"**를 기준으로 지금까지의
과정을 정직하게 진단한다. 근거는 추측이 아니라 이 세션에서 실제로 한 것/안 한 것,
그리고 repo 설정(`.claude/`, `.github/`)의 실제 내용이다.

---

## 종합 점수: **B+**

> 엔지니어링 규율은 실무 상위권. 그러나 **Claude 고유의 검증 도구(skill·hook·검토 subagent)를
> 거의 안 썼고**, 정작 우리가 문서에 박아둔 리뷰 단계를 건너뛰었다.
> = "좋은 주니어가 규율 있게 일한 결과물" 수준.

**잘한 것 (이미 A급)**
- 작은 단위 커밋 + 단계별 PR (Stage 1 / Stage 2 분리)
- 신규 핵심 로직에 테스트 우선 (taxonomy·mapper·analysis 27개)
- plan-first (탐색 → 구조 설명 → 계획 → 단계 분해)
- 히스토리 위생 (머지 전 "Stage N" 표현 제거, `--force-with-lease`)
- 결정·할 일을 대화가 아니라 repo 문서로 외부화 (`EMOTION_ANALYSIS.md` 추적 문서)

---

## 영역별 진단

### 1. Agent(서브에이전트) 활용 — △ 보통

| 항목 | 실제 |
|------|------|
| 사용 | Explore 에이전트 2회 (CLAUDE.md workflow 조사, prod-readiness 스윕) — 적절한 fan-out |
| 인라인 처리 | Stage 1·2 구현은 전부 직접. 이 규모(파일 몇 개·강결합 편집)에선 **옳은 선택** |
| 미사용 | **단계별 독립 코드리뷰 에이전트(adversarial review) 0회** / Plan 에이전트 / Workflow |

- 핵심 공백: "내가 짜고 내가 통과 확인"만 했고 **제3의 시각 검증이 없었다.**
  실무라면 단계마다 리뷰 에이전트로 교차검증할 가치가 크다.

### 2. Skill / Hook 활용 — ✗ 가장 약함

- **Skill: 0회.** 가장 큰 모순. `CLAUDE.md`에
  *"머지 전 `/code-review`, auth·API·service-role 건드리면 `/security-review`"* 를
  **직접 써놓고 PR 3개를 그 둘 없이 올렸다.** 전역에 `code-review` 플러그인까지 켜져 있는데도.
  - 특히 다음 Stage 3는 `api/diary`·`summarize`를 건드려 `/security-review`가 정확히 지시되는
    지점이고, prod-readiness 스윕이 거기서 **인가 누락**을 이미 찾았다.
- **Hook: 사실상 미사용.** 전역 `~/.claude/settings.json`에 알림음 훅 하나뿐.
  - "커밋 전 검증" 규칙을 **Stop/PostToolUse 훅으로 자동 강제**할 수 있는데 전부 수동.
  - main 직접 커밋 차단(PreToolUse) 같은 가드도 없음.
  - → 규칙을 "문서"가 아니라 "훅"으로 만들면 잊을 수가 없다.

### 3. CLAUDE.md 누락 정보

지금도 좋은 편이나 빠진 것:
- **테스트 컨벤션** — `__tests__/` 위치, 그리고 이번에 확립한 패턴
  (*supabase/openai 같은 side-effect 모듈에서 순수 로직 분리 + client 주입으로 mock*)이 미기재.
  이미 우리 코드의 컨벤션인데 문서엔 없다.
- **CI 실체** — "커밋 전 검증" 문구는 있으나 **CI가 번들 크기만 검사**하고
  test/typecheck/lint는 안 돈다는 사실이 없어 독자가 오해.
- **보안 모델** — service-role 키라 **모든 쿼리가 RLS를 우회** → app 레벨 소유권 체크가
  필수라는 결정적 맥락이 빠짐.
- **`.env.example` 불일치** — README는 `cp .env.example .env.local`라는데 실제 파일이 안 보임.
- **auth 세션 형태**(`session.user.id` 출처), **OpenAI structured-output 패턴**(이제
  `emotionAnalysis.ts`에 있음) 미기재.

### 4. 실무(프로덕션) 관점 약점

> **공정하게**: pagination·validation·resilience 상당수는 이미 `docs/PERFORMANCE.md`에
> **인지·추적 중**(미완일 뿐). 그건 좋은 신호다. 아래는 그걸 감안한 진짜 구멍.

- **CI가 test/typecheck/lint를 안 돌림** — 우리가 만든 안전망이 **자동 강제되지 않음** (최대 약점).
- **API 입력 검증/크기 제한 없음**(zod 없음) — `content` 무제한; `api/*` try/catch 없어 거친 500.
- **인가 부재** — chat rooms/messages/summarize에 per-resource 소유권 체크 없음
  (roomId 추측으로 타인 접근). *단 채팅은 제품상 deferred 영역이라 긴급도는 낮음.*
- **env 검증·`.env.example`·에러 트래킹(Sentry)·구조적 로깅·OpenAI 비용 rate limit 전부 없음.**
- **테스트 얕음** — 단위 4파일, 라우트/통합/e2e 0.

### 5. Context 주입 적절성 — 🟢 강점 (한 곳만 지저분)

- **잘함**: `CLAUDE.md`·`PRODUCT_DIRECTION.md`·`PERFORMANCE.md`·새 `EMOTION_ANALYSIS.md`·
  plan 파일까지 — **컨텍스트 위생이 실무 평균 이상.** 결정을 repo에 외부화한 게 특히 좋음.
- **지저분한 곳**: `.claude/settings.local.json`의 권한 allowlist가 **자동 누적된 쓰레기 21개** —
  정확한 커밋 메시지·정확한 gh 명령 같은 일회성 항목들. `Bash(git *)`·`Bash(pnpm *)`·
  `Bash(gh pr *)` 패턴으로 **큐레이션**해야 재사용된다 (`/fewer-permission-prompts`가 이걸 위한 것).
- **persistent memory 미사용** — 세션 간 user/project 사실을 메모리에 안 남김.

---

## 한 줄 결론

> B+ → A로 가는 핵심은 셋이다 — ① 문서화한 **리뷰 스킬을 실제로 돌리고**,
> ② 검증을 **훅으로 자동화**하고, ③ **CI에 test/typecheck/lint 게이트**를 추가하는 것.
> 구체 실행은 [roadmap.md](./roadmap.md) 참조.
