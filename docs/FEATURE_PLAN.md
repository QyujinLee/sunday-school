# 신규 기능 계획 — 구글 캘린더 쓰기 · 게스트 모드

다른 PC/세션에서도 이어서 작업할 수 있도록 기술 검증 결과, 결정 사항, 구현 단계를 기록한다.
작업 규칙은 저장소 루트의 `CLAUDE.md` / `AGENTS.md`를 먼저 읽을 것. 기존 개선 작업은 `docs/IMPROVEMENT_PLAN.md` 참고.

**최종 갱신**: 2026-09-15 (기술 검증 완료, 주요 방식 결정, 구현 전)

---

## 요약

| 기능 | 가능 여부 | 권장 방식 | 선결 조건 |
|---|---|---|---|
| 사회·단상 순서, 주간 일정 목록 입력 | **가능** | 서비스 계정 + 캘린더 공유(`writer`). 그 주 이벤트의 제목·설명을 수정 | 서비스 계정 생성·캘린더 공유 후 **실제 쓰기 시험(4-0)** 통과 |
| 날짜별 개별 일정 생성·수정·삭제 | **가능** | 앱이 만들 때 표식(`extendedProperties.private`)을 넣고, **표식이 있는 일정만** 수정·삭제 | 위와 같음 |
| 게스트 모드 (비로그인 둘러보기) | **가능** | `/guest/*` 별도 경로 + 데모 데이터 | 없음 |

---

## 현재 상태 (코드 기준 사실)

### 구글 캘린더 연동 — 읽기 전용

- `src/server/calendar/google-calendar.ts`의 `getWeeklyCalendarSummary()`가 **API 키**(`GOOGLE_CALENDAR_API_KEY`)로 `events.list`를 호출한다. 이번 주/다음 주 범위를 `singleEvents=true`로 조회한다.
- 이벤트 선택: `pickBestWeeklyEvent()`가 제목에 `사회|단상`이 있거나 설명에 `주간 일정`이 있는 이벤트를 우선 고르고, 없으면 **그 주의 아무 이벤트나** 고른다.
- 파싱 규칙
  - 제목: `사회: 이름 / 단상: 이름` (`/`로 구분, `:` 또는 `：`)
  - 설명: `[주간 일정]` 헤더 다음 줄들을 목록으로 사용(번호·불릿 제거)
- 캐시: `fetch` revalidate 7일 + 인메모리 스냅샷 폴백. 대시보드의 새로고침 버튼 → `src/app/api/dashboard/refresh-calendar/route.ts` → `revalidatePath('/dashboard')`, `revalidatePath('/attendance')`.
- 표시: `src/app/attendance/AttendanceDashboard.tsx` (대시보드 주간 일정 카드).
- **API 키는 공개 데이터만 익명으로 접근할 수 있다**(공식 문서). 즉 현재 교회 캘린더는 공개 상태이며, 사회·단상 이름은 이미 외부에 공개돼 있다.

### 인증/접근 제어

- `src/proxy.ts`: 공개 경로는 `/`, `/login`뿐. 그 외(API 포함)는 미로그인 시 `/login`으로 리다이렉트.
- `src/lib/auth.ts`: next-auth v4 Google provider **기본 스코프**, JWT 세션. DB adapter/Account 테이블이 없어 **구글 access/refresh token을 저장하지 않는다.**
- 쓰기 API는 모두 서버에서 승인 상태를 검증한다: `src/lib/api-session.ts`의 `requireApprovedTeacher()`/`requireAdminTeacher()`, 또는 같은 조건을 직접 검사(`src/app/api/attendance/interactive/route.ts`, `src/app/api/students/talent-reset/route.ts`(ADMIN), `src/app/api/students/[student_id]/attendance-ledger/route.ts`). → 세션이 없는 게스트는 403.
- 정책 문서: `docs/PRD.md` "로그인하지 않은 사용자가 임의 URL로 접근하면 로그인 페이지로 리다이렉트", `docs/PROJECT_POLICY.md` "로그인 사용자만 서비스 접근 가능". → **게스트 모드는 정책 변경**이므로 문서 갱신 필수.

### 개인정보 노출 지점

| 화면 | 조회 위치 | 노출되는 개인정보 |
|---|---|---|
| 대시보드 | `src/server/attendance/service.ts` `getAttendancePageData()` | 학생 이름·생년월일(분기 생일자), 교사 이름·이메일·생년월일(월 생일자), 사회·단상 이름 |
| 출석 관리 | `src/server/attendance/service.ts` `getAttendanceInteractiveData()`, `/api/attendance/interactive` | 학생 이름·생년월일·달란트, 달란트 로그 |
| 학생 관리 | `src/app/students/page.tsx` | 이름·성별·생년월일·**주소·연락처·보호자(이름·관계·연락처)**·달란트 |
| 학생 출석부 | `/api/students/[student_id]/attendance-ledger` | 학생 정보 + 출석 이력 |
| 교사 정보 | `src/app/teachers/page.tsx` | 이메일·이름·연락처·생년월일·담당학년 |
| 가입 관리 | `src/app/signup-management/page.tsx` (ADMIN) | 교사 이메일 등 |
| 메뉴 외부 링크 | `src/lib/menu-items.ts` | 회의록(노션), **재정 관리(구글 시트)**, 자료 모음(노션), 연간 계획(구글 캘린더) 링크 |

> 학생 대부분이 유아부~초등 6학년 **아동**이다(`src/utils/grade.ts`).

---

## 기능 1 — 구글 캘린더 쓰기

### 기술 검증 결과

- `events.insert`는 OAuth 스코프(`calendar`, `calendar.events`, `calendar.app.created`, `calendar.events.owned` 중 하나)가 필요하다. **현재의 API 키로는 쓰기 불가.**
- `events.insert`의 필수 필드는 `start`/`end`뿐이며, 종일 일정은 `start.date`/`end.date`를 쓴다.
- 캘린더 ACL의 `writer` 역할은 "이벤트 읽기·쓰기"가 가능하고, 개인 사용자에게 공유할 수 있다.
- 비용: 표준 사용은 **추가 비용 없음**. 할당량은 분당 프로젝트 10,000건 / 사용자 600건. 할당량 초과분은 2026년 하반기부터 과금 예정이라고 공지돼 있다. 우리 사용량(주 몇 건)은 한참 아래다.

### 인증 방식 비교

| | A. 서비스 계정 **(권장)** | B. 교사 개인 OAuth |
|---|---|---|
| 동작 | 서버가 로봇 계정으로 쓴다. 교회 캘린더를 서비스 계정 이메일에 "일정 변경" 권한으로 공유 | 교사가 로그인할 때 캘린더 권한에 동의하고, 저장한 토큰으로 대신 쓴다 |
| 코드 변경 | 서버 모듈 1개 + 환경변수 2개 | 스코프 추가, refresh token 저장용 DB 모델(현재 JWT만 사용), 토큰 갱신 로직 |
| 운영 리스크 | 키 유출 시 공유한 캘린더만 영향 → 환경변수로만 보관 | OAuth 앱이 테스트 상태면 **refresh token 7일 만료**, 공개 운영 시 **구글 앱 검증** 필요, refresh token은 **최초 로그인 때만** 발급 |
| 기록 | 캘린더에 입력한 교사가 남지 않음 | 교사 계정으로 기록됨 |

→ **A로 결정(2026-09-15).** 1인 운영·무료 운영 제약에 맞고, B는 토큰 만료와 앱 검증 때문에 운영 부담이 크다.

### 데이터 원본 결정

| | A. 캘린더를 원본으로 유지 **(권장)** | B. DB 저장 + 캘린더 동기화 |
|---|---|---|
| 방식 | 앱 입력 → 서버가 해당 주 이벤트를 수정(없으면 생성). 읽기는 기존 파서 그대로 | 새 Prisma 모델(날짜·사회·단상·주간 일정·`googleEventId`)에 저장 후 캘린더 반영 |
| 장점 | DB 스키마 변경 없음. 구글 캘린더에서 직접 고쳐도 앱에 그대로 반영 | 입력 이력·검색 가능, 캘린더 장애 시에도 앱 표시 가능 |
| 단점 | 입력 이력 없음 | 동기화 실패·양쪽 불일치 처리 필요 |

→ **A로 결정(2026-09-15).** 기존 코드가 이미 캘린더를 원본으로 읽고 있어 가장 짧은 경로다. 입력 이력이 필요해지면 B로 확장한다.

### 이벤트 형식과 안전장치

- 쓰는 형식은 **기존 파서와 반드시 호환**돼야 한다.
  - 제목: `사회: {이름} / 단상: {이름}`
  - 설명:
    ```
    [주간 일정]
    - 일정 1
    - 일정 2
    ```
- **덮어쓰기 방지**: 읽기용 `pickBestWeeklyEvent()`는 조건에 맞는 이벤트가 없으면 그 주의 아무 이벤트나 고른다. 쓰기에 그대로 쓰면 수련회 같은 **다른 일정을 덮어쓸 수 있다.** 쓰기용 검색은 `사회|단상` 제목 또는 `[주간 일정]` 설명이 있는 이벤트만 대상으로 하고, 없으면 새로 만든다.
- **앱이 만든 일정 식별(개별 일정용)**: 앱이 일정을 만들 때 `extendedProperties.private`에 표식(예: `sundaySchool=1`)을 넣는다. `events.list`의 `privateExtendedProperty=이름=값` 파라미터로 그 표식이 붙은 일정만 조회할 수 있다(공식 문서). **수정·삭제는 표식이 있는 일정만 대상으로 하고, 사람이 캘린더에서 직접 만든 일정은 앱에서 절대 건드리지 않는다.**
- 주간 이벤트(사회·단상)는 사람이 이미 만들어 둔 것을 고쳐야 하므로 표식이 없을 수 있다. 제목·설명 규칙으로 찾아 수정하되, 앱이 새로 만들 때는 표식을 함께 넣는다.
- **반복 일정**: 시리즈 전체가 아니라 해당 회차만 수정한다. `singleEvents=true`로 조회하면 각 회차가 `recurringEventId`와 `originalStartTime`을 가지므로, 회차의 `id`로 수정한다.
- 수정 시 제목·설명만 바꾸고 나머지 필드(시간, 알림 등)는 유지한다.
- 이벤트 생성(build)과 파싱(parse)을 같은 파일에 두고 **왕복 테스트**(build → parse = 입력값)를 Vitest로 고정한다(테스트 정책의 순수 로직 범위).

### 구현 단계

- **4-0 사전 시험** (형님 작업 포함, 외부 설정 의존이라 가장 먼저)
  - [ ] 기존 API 키가 있는 Google Cloud 프로젝트에서 서비스 계정 생성, 키 발급
  - [ ] 구글 캘린더 설정 → 특정 사용자와 공유 → 서비스 계정 이메일, "일정 변경" 권한
  - [ ] 로컬 스크립트로 테스트 이벤트 생성·삭제가 되는지 확인 (**공식 문서에서 개인 캘린더를 서비스 계정에 공유해 쓰는 방식의 명시 문구를 찾지 못했으므로 반드시 실측**. 실패 시 인증 방식 B 재검토)
  - [ ] 실제 주간 이벤트가 **종일/시간 지정**인지, **반복 이벤트**인지 확인 (`singleEvents=true`로 읽고 있어 반복 이벤트일 수 있음. 반복이면 전체 시리즈가 아니라 해당 회차만 수정해야 함)
- **4-1 서버 모듈**: `src/server/calendar/google-calendar.ts`에 쓰기 함수 추가
  - 서비스 계정 인증: JWT(RS256, `iss`/`scope`/`aud`/`iat`/`exp`) 서명 → `https://oauth2.googleapis.com/token`에서 액세스 토큰(1시간) 교환
  - 서명 라이브러리: `jose`가 next-auth 경유로 이미 설치돼 있음(4.15.9) → **직접 의존성으로 명시**해서 사용. 공식 문서는 암호화 처리를 추상화한 라이브러리 사용을 권장하므로, 직접 구현이 부담되면 `google-auth-library`를 추가한다(`googleapis` 전체 패키지는 불필요).
  - 환경변수: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (**값은 문서에 기재 금지**. 여러 줄 개인키의 Vercel 환경변수 개행 처리는 구현 시 확인)
- **4-2 API route**: 캘린더 쓰기
  - 권한 가드: `src/lib/api-session.ts`의 `requireAdminTeacher()` — **관리자만 입력**(결정 사항)
  - 입력 검증: `src/lib/validation/`에 zod 스키마 추가 + 테스트
  - 기능: (1) 주간 일정 저장(그 주 이벤트의 제목·설명 수정), (2) 개별 일정 생성·수정·삭제(**표식이 있는 일정만**)
  - 성공 시 기존 새로고침과 동일하게 `revalidatePath('/dashboard')`, `revalidatePath('/attendance')` + 인메모리 스냅샷 갱신
- **4-3 UI**: 클라이언트 컴포넌트 + API route 원칙(`CLAUDE.md` 아키텍처 원칙)
  - 대시보드 주간 일정 카드에 "수정" 버튼 → 이번 주/다음 주 폼(사회·단상·주간 일정 목록)
  - 개별 일정 화면: 앱이 만든 일정 목록 + 생성·수정·삭제. 메뉴는 관리자에게만 노출(`src/lib/menu-items.ts`), 삭제는 확인 단계를 둔다
- **4-4 검증**: 필수 검증 절차 + 실제 캘린더 반영 확인 + 구글 캘린더에서 직접 수정한 내용이 앱에 반영되는지 확인

---

## 기능 2 — 게스트 모드

### 기술 검증 결과

- **가능.** 모든 페이지가 동적 SSR이고 서버에서 Prisma로 직접 조회하므로, **서버에서 걸러낸 데이터만** 클라이언트로 보낼 수 있다.
- 마스킹은 반드시 **서버에서** 한다. 클라이언트에서 가리면 HTML/RSC 페이로드에 원본이 그대로 실린다.
- 쓰기 API는 이미 승인 세션을 서버에서 검증하므로 게스트 요청은 403이다. UI에서는 버튼을 비활성화하고 안내만 하면 된다.

### 핵심 결정: 무엇을 보여줄 것인가

| | A. 데모 데이터 **(권장)** | B. 실데이터 마스킹 |
|---|---|---|
| 방식 | 가짜 학생·교사·출석 데이터를 코드(고정 fixture)로 제공, DB 조회 안 함 | 실제 DB 조회 후 서버에서 마스킹 |
| 노출 위험 | 없음 | 이름 일부(`김*수`) + 학년 + 출석·생일 조합으로 **교회 구성원은 특정 가능**. 대상 대부분이 아동 |
| 구현 | 게스트 경로에서 fixture를 넘기는 분기 | 모든 페이지·API에 마스킹 적용, **한 곳이라도 빠지면 곧바로 유출** |
| 운영 | 게스트 방문이 DB 조회를 만들지 않음 | 게스트 방문마다 DB 조회 |
| 단점 | 실제 운영 현황은 보여줄 수 없음, fixture 유지보수 | 누락 리스크, 정책 변경 폭이 큼 |

→ **A로 결정(2026-09-15).** 목적이 "시스템이 어떤지 보여주기"라 실데이터가 필요 없다. 부수 효과로 `docs/IMPROVEMENT_PLAN.md` Phase 3(README 스크린샷)을 **개인정보 없이** 게스트 화면으로 찍을 수 있다.

### 마스킹 규칙 (B 선택 시, 또는 A에서도 실데이터가 섞이는 경우)

| 항목 | 규칙 |
|---|---|
| 이름 | 가운데 가림 `김*수`, 두 글자는 `김*` |
| 연락처 | `010-****-1234` |
| 주소 | **조회 자체를 하지 않음** |
| 보호자 정보 | **조회 자체를 하지 않음** |
| 생년월일 | 원본은 서버에서 학년 계산에만 쓰고, 화면에는 학년 라벨만 전달 |
| 이메일 | `g***@gmail.com` |
| 사회·단상 이름 | 캘린더는 이미 공개지만 게스트 화면에서는 마스킹 |

- 마스킹 함수는 `src/lib/masking.ts` **한 곳에만** 두고 Vitest로 테스트한다(학년 계산 단일화 원칙과 동일).
- Prisma `select` 단계에서 민감 필드를 아예 빼는 것을 우선한다.

### 게스트 진입 방식

| | 1. `/guest/*` 별도 경로 **(권장)** | 2. 게스트 쿠키 + 기존 URL 공유 |
|---|---|---|
| 방식 | `/guest/dashboard` 등 별도 페이지가 기존 표시 컴포넌트를 재사용 | 기존 페이지마다 게스트 여부로 데이터 분기 |
| 보안 | 기존 경로의 가드는 그대로, `proxy.ts`에 `/guest`만 공개 추가 | 모든 서버 조회에 분기가 필요, 실수하면 원본 노출 |

→ **1 권장.** 실데이터 경로의 보안 동작이 바뀌지 않는다.

### 게스트 화면 범위 (제안)

- 공개: 대시보드, 출석 관리, 학생 관리, 교사 정보 (모두 데모 데이터), 레크레이션(개인정보 없음)
- 제외: 가입 관리, **외부 링크 메뉴 전부**(회의록·재정 관리·자료 모음·연간 계획)
- 모든 쓰기 버튼 비활성 + "게스트 모드에서는 저장되지 않습니다" 안내
- 상단에 "게스트 모드 · 예시 데이터" 배너

### 구현 단계

- **5-0 결정**: 데이터 방식(A/B), 공개 화면 범위
- **5-1 라우트 가드**: `src/proxy.ts`에 `/guest` 공개 경로 추가. **테스트 먼저**: `src/proxy.test.ts`에 `/guest` 허용 + 기존 경로는 여전히 차단되는 케이스 추가(권한 판정 변경 시 테스트 선행 원칙)
- **5-2 데모 데이터**: `src/server/guest/` 아래 fixture. 날짜는 `src/utils/date.ts` 기준 **오늘(KST) 기준 상대값**으로 만들어 대시보드가 항상 최신처럼 보이게 하고, 학년은 `src/utils/grade.ts`로 계산되도록 생년월일을 구성
- **5-3 페이지 분리**: `src/app/students/page.tsx`, `src/app/teachers/page.tsx`는 조회와 렌더가 한 파일에 있음 → 표시 컴포넌트를 분리해 실데이터/게스트 페이지가 같이 쓰도록 리팩터. 대시보드는 이미 `AttendanceDashboard.tsx`로 분리돼 있음
- **5-4 UI**: 로그인 페이지에 "게스트로 둘러보기" 버튼, `src/components/layout/AppShell.tsx`(현재 `isSignedIn && isApproved`일 때만 메뉴 표시)에 게스트 배너·메뉴 처리, `src/lib/menu-items.ts`에 게스트용 메뉴(외부 링크 제외)
- **5-5 문서 갱신**: `docs/PRD.md` 접근 제어, `docs/PROJECT_POLICY.md` 역할·권한, `CLAUDE.md` 인증/권한 섹션(`CLAUDE.md` 변경 관리 규칙)
- **5-6 검증**: 필수 검증 절차 + 비로그인으로 `/guest/*` 접근, 기존 경로 차단 유지, 게스트 페이지 HTML에 실데이터 문자열이 없는지 확인

---

## 권장 진행 순서

1. **4-0 캘린더 사전 시험** — 외부 설정에 달려 있고 결과에 따라 인증 방식이 바뀌므로 먼저 확인
2. **기능 1 구현** (4-1 ~ 4-4)
3. **5-0 게스트 결정 → 기능 2 구현**
4. 게스트 화면으로 `docs/IMPROVEMENT_PLAN.md` Phase 3 README 스크린샷 촬영

---

## 결정 사항 (2026-09-15 확정)

| 항목 | 결정 | 영향 |
|---|---|---|
| 캘린더 입력 권한 | **관리자만** | API 가드는 `requireAdminTeacher()`, 입력 메뉴·버튼도 관리자에게만 노출 |
| 입력 범위 | 주간 일정 목록 + **날짜별 개별 일정 생성·수정·삭제** | 개별 일정용 표식과 목록 화면이 추가로 필요(4-2, 4-3) |
| 캘린더 데이터 원본 | **구글 캘린더** | DB 스키마 변경 없음. 입력 이력은 남지 않음 |
| 게스트 데이터 | **데모 데이터** | 마스킹 규칙은 예비로만 남겨둠. 게스트 경로에서 DB 조회를 하지 않음 |
| 인증 방식 | **서비스 계정** | 환경변수 2개 추가, 4-0 시험 통과가 전제 |

## 남은 확인 사항

- **게스트 공개 화면 범위**: 위 제안(대시보드·출석·학생·교사·레크레이션 공개, 가입 관리와 외부 링크 제외)대로 진행한다. 조정이 필요하면 5-0에서 확정.
- **Google Cloud 콘솔 작업**: 서비스 계정 생성과 캘린더 공유는 형님 계정 권한이 필요하다(4-0).

## 확인되지 않은 것 (구현 전 검증 필요)

- 개인 구글 캘린더를 서비스 계정 이메일에 `writer`로 공유했을 때 실제로 쓰기가 되는지 → 4-0에서 실측
- 실제 주간 이벤트의 형태(종일/시간 지정, 반복 여부) → 4-0에서 확인
- 여러 줄 개인키를 Vercel 환경변수에 넣을 때의 개행 처리 → 4-1에서 확인
- 할당량 초과 과금의 세부 정책(2026년 하반기 예정) → 사용량이 한참 아래지만 적용 시점에 공지 확인

---

## 근거 문서

- [Events: insert — 필요 스코프](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Events: list — privateExtendedProperty 검색, singleEvents](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Events 리소스 — extendedProperties, 반복 일정 필드](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Create events — 필수 필드, 종일 일정](https://developers.google.com/workspace/calendar/api/guides/create-events)
- [Calendar sharing — ACL 역할](https://developers.google.com/workspace/calendar/api/concepts/sharing)
- [Calendar API 할당량·비용](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Calendar API 스코프·앱 검증](https://developers.google.com/workspace/calendar/api/auth)
- [인증 정보 종류 — API 키는 공개 데이터만](https://developers.google.com/workspace/guides/create-credentials)
- [서비스 계정 서버 간 인증 (JWT, 토큰 엔드포인트)](https://developers.google.com/identity/protocols/oauth2/service-account)
- [OAuth 2.0 — refresh token 만료(테스트 상태 7일)](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth v4 Google provider — 스코프·refresh token](https://next-auth.js.org/providers/google)
