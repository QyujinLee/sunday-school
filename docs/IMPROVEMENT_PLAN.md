# 개선 작업 진행 계획 (Phase 단위)

다른 PC/세션에서도 이어서 작업할 수 있도록 진행 상황과 남은 작업을 기록한다.
작업 규칙은 저장소 루트의 `CLAUDE.md` / `AGENTS.md`를 먼저 읽을 것.

**최종 갱신**: 2026-09-07 (Phase 0·1·2 완료, 남은 것은 Phase 3)

---

## 배경

배포 후 실제 운영에서 확인된 문제:

1. 버튼·폼 같은 인터랙티브 요소가 전부 **Server Action + `redirect()`** 방식이라 클릭 한 번마다 서버 왕복 + 전체 페이지 재렌더가 발생해 체감 속도가 나빴다.
2. 자동화 테스트가 전무해 학년/날짜 계산 같은 순수 로직에서 버그가 반복 발생했다(`git log`의 "학년 계산 로직 통일" 등).
3. README가 기획 초안 수준이라 프로젝트 구조·화면 파악이 어렵다.

목표: **인터랙션 체감 속도 개선 → 회귀 방지 테스트 도입 → 문서 정비** 순서로 진행.

---

## Phase 0 — AI 작업 규칙 문서화 ✅ 완료

- 루트에 `CLAUDE.md` 생성, 동일 내용을 `AGENTS.md`로 미러링(어떤 AI 도구로 작업해도 같은 원칙 적용).
- 포함된 규칙: 호칭(형님), 한글 응답, 추측 금지(공식 문서/`llms.txt` 확인 후 답변), 완료 보고 전 자체 검토 반복, 도메인 용어, 렌더링 방식, 아키텍처 원칙, 코드 컨벤션, 인증/권한, 날짜 정책, 테스트 정책, 인코딩 안전 원칙.
- `docs/AI_SESSION_SCRIPT.md`는 레거시로 두고, 충돌 시 `CLAUDE.md`가 우선.

---

## Phase 1 — 인터랙티브 요소 클라이언트 전환 ✅ 코드 완료 / 수동 검증 대기

앱에서 인라인 `'use server'` Server Action이 **전부 제거**됨(0건).

### 신규 파일

| 파일 | 역할 |
|---|---|
| `src/lib/api-session.ts` | `requireApprovedTeacher()` / `requireAdminTeacher()` 공용 세션 가드 |
| `src/lib/validation/student.ts` | 학생 zod 스키마 + 전화번호/텍스트 정규화 + 필드 오류 맵 |
| `src/lib/validation/teacher.ts` | 교사 수정 zod 스키마 + 담당학년 옵션 |
| `src/app/api/students/route.ts` | `POST` 학생 생성 |
| `src/app/api/students/[student_id]/route.ts` | `PATCH` 수정 / `DELETE` 삭제 |
| `src/app/api/teachers/[teacher_id]/route.ts` | `PATCH` 교사 수정(관리자 또는 본인만, `isActive`는 관리자만) |
| `src/app/api/signup-management/route.ts` | `POST` + action 디스크리미네이터(`approve`/`reject`/`toggle_role`/`delete`), 본인 계정 보호 |
| `src/app/api/dashboard/refresh-calendar/route.ts` | `POST` 주간 일정 캐시 무효화 |
| `src/app/students/StudentForm.tsx` | 학생 등록/수정 공용 클라이언트 폼(삭제 포함) |
| `src/app/teachers/[teacher_id]/edit/TeacherEditForm.tsx` | 교사 수정 클라이언트 폼 |
| `src/app/signup-management/SignupManagementList.tsx` | 가입 관리 목록 + 4개 액션, 로컬 상태 갱신 |

### 삭제된 파일 (리다이렉트 방식이 사라지며 불필요해짐)

`StudentCreateErrorToast`, `StudentEditErrorToast`, `TeacherEditResultToast`, `TeachersResultToast`, `SignupManagementResultToast`, `DeleteStudentButton`, `DeleteTeacherButton`

> 예외: 학생 삭제 후 목록으로 이동하는 플로우만 `?success_code=student_deleted` + `StudentsResultToast`를 유지한다.

### 핵심 변경 사항

- 검증 실패 시 페이지 이동이 없어 입력값이 그대로 남고, 필드 아래에 오류 메시지가 즉시 표시된다. → 폼값을 쿼리스트링으로 직렬화/역직렬화하던 헬퍼 전량 삭제.
- 모든 신규 API route는 세션·승인상태·권한을 서버에서 재검증한다(기존 학생 등록/수정 Server Action에는 세션 검증이 아예 없었음 → 방어 한 겹 추가).
- 상태 관리는 `useState` + `fetch`. 기존 `AttendanceInteractiveSection.tsx`의 React Query는 그대로 유지(불필요한 의존 확산 방지).
- 수정된 파일 기준 **2,114줄 삭제 / 149줄 추가**.

### 검증 상태

- ✅ `yarn tsc --noEmit`
- ✅ `yarn lint`
- ✅ `yarn prettier --check` (신규/재작성 파일 기준. 저장소에 원래부터 포맷 불일치인 기존 파일 다수 존재 — 별도 정리 필요)
- ✅ `yarn dotenv -e .env.local -- next build` (※ `yarn build`는 `prisma migrate deploy`가 실제 DB를 건드리므로 검증 시에는 next build만 실행)
- ✅ 비로그인 상태에서 신규 API·페이지 전부 로그인 리다이렉트 확인
- ⬜ **로그인 후 실제 화면 동작 확인 (남은 작업)** — 아래 체크리스트 참고

### 권한 로직 기존 코드 대조 결과 (2026-09-07)

실데이터라 수동 테스트가 어려워, 되돌릴 수 없는 동작을 기존 Server Action 코드(`git show 8fe9b78:...`)와 1:1 대조함.

| 동작 | 기존 | 현재 | 판정 |
|---|---|---|---|
| 가입 승인/거절 | ADMIN 확인 → `approvalStatus` + `approvalProcessedAt` 갱신 | 동일 | 일치 |
| 권한 토글 자기보호 | 본인 + `TEACHER`로 강등일 때만 차단 | 동일 | 일치(기준 세션이 요청 시점으로 바뀌어 더 정확) |
| 교사 삭제 자기보호 | 본인 계정 차단 | 동일 | 일치 |
| 교사 수정 권한 | 관리자 또는 본인, `is_active`는 관리자만 | 동일(비관리자 요청은 필드 자체를 제외) | 일치 |
| 학생 등록/수정/삭제 | **세션 검증 없음**(미들웨어에만 의존) | `requireApprovedTeacher()` 추가 | 강화됨 |
| 관리자 API 접근 | `role === 'ADMIN'`만 확인 | 승인 상태까지 확인 | 강화됨 |

→ 권한이 느슨해진 곳은 없고, 두 군데가 오히려 강화됨. 위 판정은 Phase 2에서 테스트로 고정했다.

### 남은 수동 검증 체크리스트

개발 서버(`yarn dev`)에서 구글 로그인 후 각 항목이 **페이지 전체 리로드 없이** 동작하는지 확인:

- [ ] 학생 등록 — 검증 실패 시 입력값 유지 + 필드 오류 표시, 성공 시 토스트 + 폼 초기화
- [ ] 학생 수정 / 삭제 — 삭제 후 목록 이동 + 토스트
- [ ] 교사 수정 — 일반 교사는 활성 상태 체크박스 비활성인지, 저장 후 값 유지되는지
- [ ] 가입 관리 승인/거절 → 대기 목록에서 사라지고 처리 목록에 추가되는지
- [ ] 가입 관리 권한 토글/삭제 → 본인 계정은 차단되는지
- [ ] 대시보드 주간 일정 새로고침
- [ ] 출석/달란트 기존 기능 회귀 없는지
- [ ] 일반 교사 계정으로 `/api/signup-management`, `/api/students/talent-reset` 직접 호출 시 403인지

---

## Phase 2 — 테스트 도입 (Vitest) ✅ 완료

운영 DB가 실데이터라 수동 테스트가 어려운 상황이라, **DB 없이 검증 가능한 로직**을 테스트로 고정했다.

- 의존성: `vitest@5` + peer로 요구되는 `vite@7` (yarn v1은 peer를 자동 설치하지 않음). 컴포넌트 테스트를 하지 않으므로 jsdom·React 플러그인은 넣지 않았다.
- 설정: `vitest.config.ts` (`@` alias → `src`, `environment: 'node'`), 스크립트 `yarn test` / `yarn test:watch`.

**테스트 72개 / 7파일, 전부 통과.**

| 파일 | 커버 내용 |
|---|---|
| `src/utils/date.test.ts` | KST 변환, UTC 기준 날짜 밀림, 만 나이 생일 전/당일/후 경계 |
| `src/utils/grade.test.ts` | 학사연도 3월 경계, 학년/유아부 경계, 출생연도만으로 결정되는지 |
| `src/lib/student-sort.test.ts` | 출생연도 → 한글 이름 정렬, 원본 불변, KST 기준 연도 판정 |
| `src/lib/validation/student.test.ts` | 전화번호 정규화·거부, 보호자 정보 all-or-nothing, 생년월일 파싱 |
| `src/lib/validation/teacher.test.ts` | 담당학년 enum, 연락처 형식, **일반 교사의 `is_active` 무시** |
| `src/lib/api-session.test.ts` | 미승인/거절/비관리자 403, 관리자만 통과 |
| `src/proxy.test.ts` | 미로그인 `callback_url` 보존, PENDING/REJECTED 분기, 비관리자 `/signup-management` 차단, 캐노니컬 도메인 리다이렉트 |

검증: `yarn test`, `yarn tsc --noEmit`, `yarn lint`, `yarn prettier --check` 모두 통과. 추가로 `grade.ts`의 학사연도 경계를 일부러 깨뜨려 테스트가 실제로 실패하는지(회귀 감지) 확인 후 원복함.

부수 변경: `.prettierrc`의 `importOrder`에 `"^node:"` 그룹을 마지막에 추가. eslint(`import/order`의 `groups`에 `builtin` 미포함 → 빌트인이 마지막)와 prettier(알파벳순 → `node:`가 앞)가 충돌해 node 빌트인을 import하는 파일이 두 검사를 동시에 통과할 수 없었다.

**Playwright는 도입하지 않기로 결정.** 근거: (1) CI(`.github/workflows`)가 없어 자동 실행 경로가 없고, (2) 가장 검증하고 싶은 구글 OAuth 로그인은 Google이 자동화 브라우저를 차단해 e2e 재현이 안 되며, (3) e2e가 커버할 인증 가드 로직은 `proxy.ts` 단위 테스트가 브라우저 없이 더 싸게 커버한다. 나중에 CI를 붙이거나 인증 e2e가 필요해지면 `AUTH_SECRET`으로 next-auth JWT 쿠키를 직접 발급해 주입하는 방식으로 확장한다.

---

## Phase 2.1 — 졸업생 학년 라벨 수정 ✅ 완료

**문제**: 졸업 판정이 두 곳에 서로 다른 기준으로 있었다.

- `src/utils/grade.ts` — 학사연도 기준 학년 계산. 6학년 초과는 else로 떨어져 `유아부` 반환.
- `src/app/students/page.tsx` — 졸업생 분리는 "만 14세 이상 + 3월 이후"(만 나이 기준).

두 기준이 1년 어긋나서, 그 사이 구간(2026학년도의 2013년생 = 중1)이 활성 목록에 **유아부로 표시**되고 있었다.

**수정**: 판정을 `grade.ts` 한 곳으로 통일(CLAUDE.md의 "학년 계산은 한 곳에서만" 원칙).

- `StudentGradeLabel`에 `졸업생` 추가, `gradeNumber > 6`이면 `졸업생` 반환.
- `isGraduateByBirthDateInKst()` 신설 → `students/page.tsx`의 만 나이 기반 `isGraduateByCurrentDate` 제거.
- `service.ts`의 중복 `GradeLabel` 타입 정의 제거 → `grade.ts`의 타입을 import.
- `AttendanceDashboard`의 학년 그룹 정렬에 `졸업생` 추가(가장 앞).
- 졸업생 패널 설명 문구를 학년 기준으로 갱신.

**동작 변화**: 초등 6학년을 마친 학생은 만 14세가 되기를 기다리지 않고 **3월부터 바로** 졸업생 패널로 이동한다.

검증: `yarn test`(76 passed), `tsc --noEmit`, `eslint` 통과. 경계 케이스(2013년생이 2026-02-28에는 6학년, 03-01에는 졸업생)를 테스트로 고정.

## Phase 3 — README 재작성 ⬜ 예정

- **스크린샷**: 개발 서버를 띄우고 구글 로그인을 완료한 뒤 로그인 → 대시보드 → 출석 관리 → 학생 관리 → 교사 정보 → 가입 관리 순으로 캡처해 `docs/screenshots/`에 저장하고 README에 삽입. (Phase 1 이후 화면 기준으로 캡처)
- **아키텍처 다이어그램**: README에 Mermaid로 직접 작성(GitHub 네이티브 렌더링).
  - 요청 흐름: 브라우저 → `src/proxy.ts`(인증/승인/권한 가드) → Server Component(Prisma 직접 조회) / Client Component → `src/app/api/*` → Prisma → Neon Postgres. 외부 연동: Google OAuth, Google Calendar API(7일 revalidate + 인메모리 폴백).
  - 데이터 모델 ER 다이어그램: `prisma/schema.prisma` 기준.
- **추가 섹션**: 프로젝트 구조 트리, 렌더링 방식 설명(전 페이지 동적 SSR, ISR 미사용 이유), 환경변수 목록(`DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAILS`, `GOOGLE_CALENDAR_ID/API_KEY` — **값은 절대 기재하지 않음**), 개발/배포 방법, `docs/*.md` 링크.

---

## 도입하지 않기로 한 것 (재검토 조건 포함)

- **`react-error-boundary`** — Next.js App Router가 `error.tsx`로 라우트 세그먼트 단위 에러 바운더리를 기본 제공하는데 현재 그것조차 미사용. 먼저 `error.tsx`를 채우고, 위젯 단위(단일 카드 등) 격리가 실제로 필요해질 때 재검토.
- **Storybook** — 디자인 시스템이 CSS 변수(`--color-*`) + `btn-*` 클래스 + `getButtonClassName()`으로 이미 재사용되고 있고, 1인 운영 규모에서 빌드/유지 비용이 이득보다 크다. 컴포넌트 수가 늘어 문서화 부재가 실제 문제가 될 때 재검토.

---

## 알려진 잔여 이슈

- 저장소에 prettier 포맷 불일치 파일이 다수 존재(`src/proxy.ts`, `src/lib/auth.ts`, `src/components/layout/AppShell.tsx` 등 40여 개). 이번 작업에서는 신규/재작성 파일만 포맷했다. 일괄 정리하려면 별도 커밋으로 분리할 것.
- 학생 목록의 "학생 등록"·"수정"은 여전히 별도 페이지로 이동한다(폼 자체는 클라이언트화 완료). 모달 방식으로 바꿀지는 사용해보고 판단.
- ~~학년 표시 버그~~ → **Phase 2.1에서 수정 완료**(아래 참고).
- **`src/server/attendance/service.ts` 인코딩 특성**: 이 파일만 UTF-8 BOM + 한글이 유니코드 이스케이프로 저장돼 있다. 편집 시 한글이 자동으로 이스케이프로 바뀌므로 주석은 ASCII로 쓸 것(CLAUDE.md에 규칙 추가함).
- 졸업생이 **출석 관리 화면에는 여전히 포함**된다(‘전체’ 탭). 학생 관리에서만 별도 패널로 분리된다. 출석 명단에서도 제외할지는 운영 판단 필요.
