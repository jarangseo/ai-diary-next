# CLAUDE.md

다음 세션에서 문맥을 빠르게 파악하기 위한 가이드. 상세 셋업은 `README.md`, 제품 방향은 `docs/PRODUCT_DIRECTION.md` 참고.

## 프로젝트 개요

**ai-diary-next** — AI와 대화하며 하루를 기록하고 감정의 흐름을 돌아보는 **개인 AI 일기 앱**.

> ⚠️ `README.md`는 초기 "공유 일기 채팅" 컨셉으로 작성되어 있다. **현재 확정 방향은 개인 AI 일기 중심**이며,
> 다인원 실시간 채팅은 인프라만 유지한 채 보류 상태다. 방향 충돌 시 `docs/PRODUCT_DIRECTION.md`가 우선한다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 |
| 패키지 매니저 | **pnpm** |
| 인증 | NextAuth v5 (Google / GitHub OAuth, JWT) |
| DB | Supabase (PostgreSQL) |
| 실시간 | Socket.IO (별도 서버, port 4000) |
| 상태 | React Query(서버) + Zustand(UI) |
| AI | OpenAI GPT-4o-mini |
| 스타일 | CSS Modules + SCSS (디자인 토큰 기반) |
| 테스트 | Vitest |

## 자주 쓰는 명령

```bash
pnpm dev          # 개발 서버 (localhost:3000)
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint
pnpm test         # Vitest watch
pnpm test:run     # Vitest 1회 실행
```

## 디렉토리 구조

```
src/
  app/
    diary/                  # 메인 (인증 필요, layout.tsx에 Gnb/Lnb)
      write/                # 일기 작성
      list/                 # 목록 + 캘린더 (SplitPanel)
      [date]/               # 날짜별 상세
      chat/                 # 채팅방 목록 / [roomId] / join  (보류 영역)
    settings/               # 설정 (미구현 — placeholder)
    login/                  # OAuth 로그인
    api/
      auth/[...nextauth]/   # NextAuth
      diary/                # 일기 CRUD API
      chat/                 # 채팅방 / 메시지 / summarize(AI 일기 생성) API
  components/               # Gnb, Lnb, SplitPanel, Calendar, Chat/*, DiaryList
  hooks/useSocket.ts        # Socket.IO 연결/이벤트 (테스트 있음)
  lib/                      # supabase, diary, chat — 서버측 쿼리
  services/chatServices.ts  # 클라이언트 fetch 래퍼 (컴포넌트는 fetch 직접 호출 X)
  stores/uiStore.ts         # Zustand UI 상태
  types/                    # diary.ts, chat.ts
  styles/                   # globals / variables / mixins (SCSS 디자인 토큰)
```

- 경로 별칭: `@/*` → `src/*`

## 데이터 모델 (핵심)

```ts
// types/diary.ts
Diary { date(YYYY-MM-DD, PK), content, isRecordOnly, emotion?, createdAt, updatedAt }
DiaryEmotion { primary, score, summary, questions? }   // ← DB 컬럼 예약, 분석 로직 미구현
```

DB 테이블: `diaries`, `chat_rooms`, `room_members`, `chat_messages` (스키마는 README 참고).
일기 upsert 충돌 키: `(user_id, date)`.

## 현재 구현 상태

**작동**: 일기 작성/조회, OAuth, 실시간 채팅방, 채팅→일기 자동 요약(`api/chat/summarize`, GPT-4o-mini).

**미완성 / 다음 작업 (개인 일기 루프 완성 순서)**:
1. 캘린더 동적화 — `components/Calendar/Calendar.tsx`가 정적 하드코딩(2026-03 고정), 클릭 동작 없음
2. 감정 분석 — `lib/diary.ts`의 `updateDiaryEmotion`이 주석 처리됨. 분석 로직 + UI 미구현
3. 설정 페이지 — `app/settings/page.tsx`가 빈 placeholder
4. (보류) 채팅 `@ai` 멘션, DiaryList 검색/필터/편집 버튼은 동작 없음

## 환경 변수 (`.env.local`)

`AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SOCKET_URL`

## 주의사항 / 함정

- **`pnpm-workspace.yaml`**: `allowBuilds`에 `@parcel/watcher`, `sharp`, `unrs-resolver`가 `true`로 설정돼 있어야 한다. placeholder 텍스트가 들어가면 `pnpm dev`가 install 단계에서 exit 1로 실패한다.
- **Socket.IO 서버는 별도 레포**(`ai-diary-chat-server`, port 4000)로 분리돼 있다. 채팅 실시간 기능 테스트 시 별도 실행 필요.
- Next.js 16에서 `src/middleware.ts`는 deprecated 경고 발생 (`proxy`로 마이그레이션 권장). 동작엔 지장 없음.
- 스타일은 SCSS 디자인 토큰(`variables.scss`, `mixins.scss`) 기반으로 통일됨. 신규 스타일도 토큰 사용.

## 컨벤션

- 응답/커밋/주석은 한국어. 기술 용어·코드 식별자는 원문 유지.
- 클라이언트는 `fetch`를 직접 호출하지 않고 `services/` 래퍼 경유.
- 서버측 DB 접근은 `lib/`의 함수 사용.
