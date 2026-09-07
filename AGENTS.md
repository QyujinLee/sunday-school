# Sunday School Manager

주일학교(서광주일학교) 출석/학생/교사 관리 시스템. 무료/저비용 운영이 최우선 제약인 **소규모 내부 서비스**입니다(교사만 사용, 관리자 교사가 가입 승인).

기획 배경과 상세 정책은 아래 문서를 참고하되, 실제 코드 작업 시 지켜야 할 규칙은 이 파일에 직접 정리되어 있습니다.
- `docs/PRD.md` — 기능 요구사항
- `docs/PROJECT_POLICY.md` — 운영 정책
- `docs/AI_SESSION_SCRIPT.md` — (레거시) 이전 세션 협업 규칙, 이 파일과 충돌 시 이 파일이 우선

## 작업 원칙 (반드시 지킬 것)

- 사용자를 `형님`으로 호칭한다.
- **모든 설명·보고·질문은 한글로 작성한다** (코드와 식별자는 예외).
- **추측으로 답하지 않는다.** 프레임워크·라이브러리 동작이나 API 스펙이 확실하지 않으면 웹 검색으로 **공식 문서 또는 해당 프로젝트의 `llms.txt`**를 직접 읽고 확인한 뒤 답한다. 특히 Next.js 16, next-auth v4, Prisma, Tailwind v4처럼 버전별 동작 차이가 큰 영역은 반드시 확인 후 답변한다.
- **완료 보고 전에 자체 검토를 반복한다.** 작업을 마쳤다고 말하기 전에 코드 리뷰와 검증(린트·타입체크·테스트·동작 확인)을 수행하고, 문제가 발견되면 수정 후 다시 검토한다. 문제가 없음을 확인한 뒤에만 "완료"라고 보고한다.

## 도메인 용어

- **달란트(Talent)**: 학생 포인트. `currentTalent`(누적, 캐시값)와 `TalentTransaction`(증감 로그)으로 관리. 증감 사유는 `ATTENDANCE`(출석 연동)와 `MANUAL_ADJUST`(수동 조정) 두 가지로 구분.
- **출석(Attendance)**: 일요일 단위(주 1회)로만 관리. 상태는 `PRESENT`/`ABSENT` 2가지뿐.
- **교사 승인 상태(TeacherApprovalStatus)**: `PENDING`(가입 대기) → `APPROVED`(승인, 서비스 이용 가능) / `REJECTED`(거절).
- **교사 권한(TeacherRole)**: `ADMIN`(가입 승인, 달란트 초기화 등 관리 기능) / `TEACHER`(일반).
- **보호자(GuardianContact)**: 학생 1명당 1개만 존재(1:1).
- **학년(grade)**: 생년월일과 학사연도(3월 시작) 기준으로 계산. 라벨은 `졸업생`/`6학년`~`1학년`/`유아부`이며, 초등 6학년을 넘기면 `졸업생`, 취학 전이면 `유아부`다. 계산 로직과 `StudentGradeLabel` 타입은 **`src/utils/grade.ts` 한 곳에서만** 정의한다 — 중복 구현 금지(과거 계산 불일치, 만 나이 기준 졸업 판정과 학년 계산이 어긋나 중학생이 유아부로 표시되던 버그 이력 있음).
- **졸업생**: 학년 계산 결과가 `졸업생`인 학생. 학생 관리 화면에서 별도 패널로 분리된다. 판정은 `isGraduateByBirthDateInKst()`만 사용하고 만 나이로 다시 계산하지 않는다.

## 기술 스택

Next.js(App Router, v16) · TypeScript · Auth.js(next-auth v4) + Google OAuth · Prisma + Neon Postgres · TanStack Query · Zustand · Tailwind CSS + SCSS · Zod · Vercel 배포.

패키지 매니저는 `yarn`만 사용한다.

## 렌더링 방식

이 프로젝트는 **ISR/SSG를 쓰지 않는다.** 모든 페이지가 로그인 세션(`getServerSession`)과 서버 데이터를 페이지 진입 시점에 직접 조회하는 완전 동적 SSR이다 — 개인화된 인증 기반 데이터라 정적/재검증 캐싱이 맞지 않기 때문. 새 페이지를 추가할 때도 `revalidate`/`generateStaticParams`를 임의로 넣지 않는다.

인증/권한 가드는 `src/proxy.ts`(Next.js 16의 middleware, 파일명이 `proxy.ts`로 변경됨)에서 전 라우트에 적용된다.

## 아키텍처 원칙

- 기본 데이터 조회는 **Server Component에서 직접 Prisma 조회**. 권한 체크는 반드시 서버에서 최종 판정(클라이언트 신뢰 금지).
- **사용자가 클릭해서 즉시 반응해야 하는 모든 요소(버튼, 폼 제출, 삭제/수정 액션)는 클라이언트 컴포넌트 + API route(fetch) 또는 React Query로 구현한다.** 실제 배포 후 Server Action의 폼 검증 실패 리다이렉트나 "수정" 버튼의 전체 페이지 라우팅 방식이 체감상 느려서 사용성 문제가 있었음이 확인됨 — 새 CRUD 화면은 `AttendanceInteractiveSection.tsx` 패턴(클라이언트 컴포넌트 + API route + React Query, 낙관적 업데이트)을 기본으로 따른다. Server Action은 리다이렉트 없이 끝나는 단순 케이스(예: 캐시 무효화 후 같은 페이지 새로고침)에만 남겨둔다.
- 전역 상태(Zustand)는 여러 페이지/컴포넌트가 동시에 참조하는 경우에만 사용. 서버 데이터 캐시는 React Query, UI 임시 상태(모달/토스트 등)는 로컬 상태나 Context로 우선 검토.
- 외부 클라이언트와 공유되는 인터페이스는 `route.ts`로 분리.
- 에러 바운더리는 Next.js 기본 제공 파일 컨벤션(`error.tsx`)을 우선 사용한다. `react-error-boundary` 같은 별도 패키지는 라우트 세그먼트 단위가 아닌 더 세밀한(단일 위젯 단위) 격리가 꼭 필요할 때만 검토.

## 코드 컨벤션

- 함수/메서드 선언부에 **한글 JSDoc** 작성.
- 이벤트 핸들러는 `handle...` 접두어 (`handleClick`, `handleSubmit`).
- `src/app` 하위 폴더명은 `kebab-case`.
- 쿼리스트링 키는 `snake_case` (예: `callback_url`).
- 모든 `next/link`는 `prefetch={false}` 강제(내부/외부 구분 없이).
- 색상은 `src/app/globals.css`의 전역 변수(`--color-*`)만 사용. 공통 버튼은 `src/lib/button.ts`의 `getButtonClassName()` 재사용(`btn-*` 클래스 체계).
- Import 정렬: `.vscode/settings.json`의 `source.organizeImports: false` 유지, `source.fixAll.eslint: true`로 처리.

## 인증/권한

- Google OAuth 단일 방식. JWT 세션, 토큰 유지 기간은 `src/lib/auth.ts`의 `DEFAULT_TOKEN_MAX_AGE_SECONDS` 참고.
- 미로그인 시 `/login`으로 리다이렉트. 승인 상태에 따라 `/pending`, `/rejected`로 분기.
- 관리자 전용 페이지(`/signup-management` 등)는 `ADMIN`만 접근.
- 인앱 브라우저(카카오톡 등 WebView)는 Google 정책상 로그인이 막힐 수 있어 외부 브라우저 유도 UI가 필요(이미 구현됨, `src/proxy.ts` 참고).

## 날짜/시간

모든 날짜·시간 계산은 **한국시간(Asia/Seoul, +09:00) 기준**. 관련 유틸은 `src/utils/date.ts`에 집중되어 있으며 신규 계산 로직도 여기에 추가하고 재사용한다.

## 테스트 정책

- **Vitest 단위 테스트**를 사용한다(`yarn test`). 설정은 `vitest.config.ts`, 테스트 파일은 대상 파일 옆에 `*.test.ts`로 둔다.
- 테스트 대상은 **DB 없이 검증 가능한 순수 로직과 가드**로 한정한다: 날짜/학년 계산(`src/utils/`), 정렬(`src/lib/student-sort.ts`), 입력 검증(`src/lib/validation/`), 세션 가드(`src/lib/api-session.ts`), 라우트 가드(`src/proxy.ts`).
- 운영 DB가 실데이터라 수동 테스트가 어렵다. **권한 판정과 입력 검증을 바꿀 때는 반드시 테스트를 먼저/함께 갱신한다.**
- Prisma 호출 자체를 모킹해 CRUD를 테스트하지는 않는다(모킹 비용 대비 가치 낮음). 브라우저 e2e(Playwright)도 도입하지 않는다 — CI가 없고 Google OAuth 로그인이 자동화 브라우저에서 차단되기 때문.
- 트리비얼한 한 줄짜리 함수/컴포넌트에는 테스트를 강제하지 않는다.

## 필수 검증 절차 (배포 전)

```
yarn lint
yarn prettier --check "src/**/*.{ts,tsx,scss}" "src/proxy.ts"
yarn tsc --noEmit
yarn test
yarn prisma validate   # 스키마 변경 시
```

> `yarn build`는 `prisma migrate deploy`가 포함되어 실제 DB를 건드린다. 빌드만 확인하려면 `yarn dotenv -e .env.local -- next build`를 사용한다.

## 인코딩 안전 원칙

- 모든 소스 파일은 UTF-8. 대량 치환/터미널 출력 붙여넣기로 파일을 덮어쓰지 않는다(과거 한글 깨짐 사고 이력 있음).
- 파일 수정은 Edit 도구(patch 기반)를 우선 사용, 셸로 직접 파일을 쓸 경우 인코딩을 명시.
- 작업 후 깨진 문자(`?숇`, `湲덉` 등) 의심 시 즉시 확인하고 린트/타입체크 재실행.
- **`src/server/attendance/service.ts` 주의**: 이 파일만 UTF-8 BOM이 붙어 있고, 모든 한글이 소스에 유니코드 이스케이프 시퀀스(백슬래시 u + 코드포인트 4자리)로 저장돼 있다. 이 파일을 편집하면 입력한 한글이 자동으로 그 형태로 변환되는데, **문자열 리터럴 안에서는 정상 동작하지만 주석이나 JSX 텍스트에서는 이스케이프가 해석되지 않아 글자 그대로 노출된다.** 이 파일에 주석을 달 때는 ASCII(영문)로 쓴다. 다른 파일에는 해당되지 않는다(한글 그대로 저장됨).

## 변경 관리

- 인증/권한/날짜 계산/출석·달란트 로직처럼 운영에 영향이 큰 변경은 커밋 메시지에 변경 이유를 명시한다.
- 정책이 실제로 바뀌면(예: 이번 아키텍처 원칙 갱신처럼) 이 문서와 `docs/PROJECT_POLICY.md`를 함께 갱신한다.
