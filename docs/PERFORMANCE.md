# 성능·복원력 방어 TODO

> 작성일: 2026-05-31 · 상태: **계획 (구현 전)**

**프레이밍**: "성능적으로 완벽"은 상태가 아니라 *지켜지는 예산(budget)*이다.
진짜 방어책은 "빠르게 만든다"가 아니라 **각 계층에서 느려지거나 터지는 걸 막고, 회귀를 감시하는 것**.

태그: `[취약]` = 지금 실제 구멍 / `[예방]` = 선제 방어

아래 4개 묶음 단위로 끊어서 구현·커밋한다(PR 비대화·회귀검증 방지). 묶음 = Task #5~#8.

---

## 묶음 A — P0 핵심 방어  (Task #5)

지금 실제 운영을 막는 가장 급한 것들.

- [ ] **데이터 페이지네이션** `[취약]` — `getAllDiaries`(전체 `select *`, LIMIT 없음) 제거
  - `getDiaryDates(userId)`: `date, emotion_primary`만 (캘린더 점용, 가벼움 + 안전 상한)
  - `getRecentDiaries(userId, {limit, before})`: 커서(date) 기반, 컬럼 명시
  - `GET /api/diary?before=&limit=` 추가 → 목록 "더 보기"/무한스크롤
  - `src/lib/diary.ts`, `src/app/diary/page.tsx`, `DiaryHome`, `DiaryList`
- [ ] **fetch 방어 래퍼** `[취약]` — `lib/http.ts`: timeout + `AbortController` + 지수 백오프 재시도
  - `services/chatServices.ts`, write 저장, summarize 호출에 적용
- [ ] **OpenAI 호출 방어** `[취약]` — `api/chat/summarize`
  - 입력 길이/토큰 상한(긴 대화 truncate), client `timeout` + `maxRetries`
  - try/catch + graceful fallback 응답
- [ ] **React Query 기본정책** `[취약]` — `Provider.tsx`
  - `staleTime`(5m) / `gcTime`(10m) / `retry`(1) / `refetchOnWindowFocus:false`
- [ ] **DB 인덱스** `[예방]` — Supabase SQL (앱 밖, 마이그레이션으로 제공)
  - `(user_id, date)`, `(user_id, updated_at desc)`

## 묶음 B — 자산·렌더링  (Task #6)

FCP/LCP·초기 로딩 개선.

- [ ] **폰트 next/font 전환** `[취약]` — 현재 render-blocking `@import`
  - Gowun Batang → `next/font/google`
  - Pretendard → `next/font/local`(자체 호스팅) 또는 preconnect+preload 최적화
    (※ `next/font/google`에 Pretendard 없음)
  - `display:swap` · subset · preload
- [ ] **Suspense 스트리밍 + 스켈레톤** `[취약]` — `getAllDiaries`/데이터 블로킹 제거
  - `src/app/diary/loading.tsx`, 데이터 fetch를 Suspense 경계로 분리
- [ ] **API Cache-Control 헤더** `[취약]` — GET 라우트(private, 짧은 max-age)
  - 저장 시 RSC `revalidateTag`/`unstable_cache` 무효화
- [ ] **이미지·코드 스플리팅** `[예방]`
  - 아바타 `next/image` `sizes`/적절한 로딩
  - 채팅·소켓 코드 `dynamic import`로 메인 번들 분리

## 묶음 C — 복원력(에러/로딩)  (Task #7)

- [ ] **라우트별 error/loading** `[취약]` — 지금 채팅에만 `error.tsx`
  - `src/app/diary/error.tsx`, `loading.tsx`, 전역 `global-error.tsx`
- [ ] **server-only 가드** `[예방]` — `import 'server-only'`
  - `lib/supabase.ts`(서비스롤 키), `lib/diary.ts`, `lib/chat.ts` 클라 번들 유입 차단
- [ ] **입력 검증** `[예방]` — `zod`로 API 입력 검증 + payload 크기 제한
  - `api/diary`(POST), `api/chat/summarize` 등
- [ ] **상태 UI·토스트** `[예방]` — 빈/오류/오프라인 상태 UI, 토스트 중복 억제(같은 id)

## 묶음 D — 측정·예산  (Task #8)

이게 없으면 "완벽"을 증명·유지할 수 없다.

- [ ] **Web Vitals(RUM)** `[취약]` — `useReportWebVitals`로 LCP/INP/CLS 실측 수집
- [ ] **번들 예산** `[예방]` — `@next/bundle-analyzer` + CI 사이즈 한계
- [ ] **Lighthouse CI** `[예방]` — PR마다 점수 게이트(회귀 차단)

---

## 보류 (별도 묶음 — 채팅/대규모 데이터 단계에서)

채팅 기능은 방향 합의상 보류(→ [PRODUCT_DIRECTION](./PRODUCT_DIRECTION.md))이므로 방어도 함께 보류.

- 실시간(소켓): 재연결 backoff 명시, 탭 비가시(`visibilitychange`) 시 연결 해제, 메시지 목록 가상화 `[예방]`
- 미들웨어 **rate limiting** `[예방]`
- 인지 성능: 작성 저장 **optimistic UI**, 대량 리스트 **가상 스크롤** `[예방]`
