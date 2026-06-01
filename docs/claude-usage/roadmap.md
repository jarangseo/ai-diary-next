# Claude Code 활용도 로드맵: B+ → A+

> 작성: 2026-06-01 · 짝 문서: [assessment.md](./assessment.md) (현 B+ 진단)

목표는 코드가 아니라 **일하는 방식**의 레벨업이다.
"Claude가 알아서 잘하길" 기대하는 게 아니라, **검증을 시스템(훅·CI·스킬)으로 박아서
잊을 수 없게** 만드는 것이 A+의 본질이다.

---

## A+ 정의 (이게 충족되면 A+)

- [ ] **리뷰 스킬 상시화** — 모든 PR 전 `/code-review`, auth·API·DB 건드리면 `/security-review`가
      "선택"이 아니라 단계 완료 조건(DoD)
- [ ] **검증 훅 자동화** — typecheck/test가 손이 아니라 훅으로 돌고, main 직커밋이 물리적으로 막힘
- [ ] **CI 게이트** — test/typecheck/lint가 PR에서 자동 차단(현재는 번들 크기만)
- [ ] **서브에이전트 교차검증** — 각 단계 후 독립 리뷰 에이전트로 adversarial 점검이 루틴
- [ ] **큐레이션된 컨텍스트** — CLAUDE.md에 공백 없음, 권한 allowlist가 패턴 기반, 메모리 활용

---

## 개선 트랙 (우선순위 / 난이도 / ROI)

| ID | 트랙 | 난이도 | ROI | 비고 |
|----|------|--------|-----|------|
| **T1** | CI 게이트(test/typecheck/lint) | 하 | ★★★ | 안전망 자동 강제. 즉시. |
| **T5** | 권한 allowlist 큐레이션 | 하 | ★★ | 프롬프트 소음↓, 즉시. |
| **T2** | 검증 훅 자동화 | 중 | ★★★ | 규칙을 훅으로. |
| **T3** | 리뷰 스킬 상시화 | 하 | ★★★ | 습관 + DoD화. |
| **T4** | CLAUDE.md 누락 보강 | 하 | ★★ | 컨텍스트 공백 제거. |
| **T6** | 단계별 adversarial 리뷰 subagent | 중 | ★★ | 제3의 시각 상시. |

---

## 트랙별 TODO

### T1. CI 게이트 추가 — *ROI 최상, 지금 당장*
- [ ] `.github/workflows/ci.yml` 신규: PR·push에 `pnpm typecheck` + `pnpm test:run` + `pnpm lint` 실행
- [ ] 기존 `bundle-budget.yml`와 역할 분리(이건 빌드/번들 전용 유지) 또는 잡 통합 결정
- [ ] 실패 시 머지 차단(브랜치 보호 규칙) 설정 — GitHub repo settings
- [ ] CLAUDE.md "Verify" 단계에 "CI가 동일 검증을 강제"임을 명시

### T5. 권한 allowlist 큐레이션 — *지금 당장*
- [ ] `/fewer-permission-prompts` 실행으로 `.claude/settings.local.json` 정리
- [ ] 일회성 항목 21개 → 패턴으로 압축: `Bash(git *)`·`Bash(pnpm *)`·`Bash(gh pr *)`·`Bash(grep *)` 등
- [ ] 위험 명령(force push, branch -D, push --delete)은 패턴에 넣지 말고 매번 확인 유지

### T2. 검증 훅 자동화 — *다음*
- [ ] `Stop` 훅: 작업 종료 시 `pnpm typecheck && pnpm test:run` 자동 실행, 실패면 알림
- [ ] `PreToolUse(Bash)` 가드: `git commit`이 현재 브랜치 `main`일 때 차단
- [ ] (선택) `PostToolUse(Edit|Write)` 훅: 변경 파일에 한해 lint/format
- [ ] `update-config` 스킬로 `~/.claude/settings.json` 또는 프로젝트 `.claude/settings.json`에 작성
- [ ] 훅이 과하게 느려지지 않게 범위 제한(변경 파일만, async 알림)

### T3. 리뷰 스킬 상시화 — *다음*
- [ ] 단계 DoD에 추가: "구현 → 테스트 → `pnpm typecheck/test/lint` → **`/code-review`** → 커밋"
- [ ] auth/API/service-role 경로 변경 시 **`/security-review`** 필수 (Stage 3가 첫 적용 대상)
- [ ] CLAUDE.md Development workflow의 review 단계를 "권장"이 아니라 "필수"로 강화
- [ ] 리뷰에서 나온 지적을 그 PR에서 바로 반영하는 흐름 정착

### T4. CLAUDE.md 누락 보강 — *다음*
- [ ] **테스트 컨벤션** 섹션: `__tests__/` 위치 + "side-effect 모듈에서 순수 로직 분리·client 주입" 패턴
- [ ] **CI 실체** 명시: 무엇을 검사/차단하는지 (T1 반영 후)
- [ ] **보안 모델** 한 줄: service-role = RLS 우회 → app 레벨 소유권 체크 필수
- [ ] `.env.example` 실제 추가 또는 README 문구 수정(불일치 해소)
- [ ] auth 세션(`session.user.id`) 형태, OpenAI structured-output 패턴 짧게

### T6. 단계별 adversarial 리뷰 subagent — *지속*
- [ ] 각 Stage 커밋 전, 독립 리뷰 에이전트에게 "이 변경을 반증해봐" 식 교차검증 1회
- [ ] 발견된 지적을 체크리스트로 반영 후 커밋
- [ ] (확장) 여러 관점(정확성·보안·성능) 병렬 리뷰로 강화

---

## 로드맵 3구간

1. **지금 당장** — T1(CI 게이트) · T5(권한 정리) — 난이도 낮고 ROI 즉시
2. **다음** — T2(훅) · T3(리뷰 스킬 DoD) · T4(CLAUDE.md 보강) — 습관·자동화 정착
3. **지속** — T6(서브에이전트 교차검증) + 아래 지표로 활용도 측정

## 활용도 측정 지표 (월 단위 체감)

- 세션당 **skill 호출 수** (목표: PR마다 `/code-review` ≥ 1)
- **훅 자동 검증 통과율** / 커밋 전 수동 검증을 잊은 횟수(목표: 0)
- **CI 차단 건수** — 막아준 회귀가 있으면 게이트가 일하는 것
- adversarial 리뷰에서 **커밋 전에 잡은 결함 수**

---

## 적용 순서 메모

이 로드맵의 첫 실전 대상은 **감정 분석 Stage 3(트리거 통합)** 이다.
`api/diary`·`summarize`를 건드리므로 T3(`/security-review`)가 자연스럽게 발동하고,
T1(CI 게이트)이 있으면 그 PR부터 test/typecheck/lint가 자동 검증된다.
즉 Stage 3를 **새 방식의 첫 시범 케이스**로 삼는 것을 권장한다.
