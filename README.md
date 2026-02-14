# Sunday School Manager

주일학교 운영을 위한 출석/학생/교사 관리 시스템입니다.

핵심 목적:
- 주 단위(일요일 기준) 출석 관리
- 학생/보호자 정보 관리
- 교사 정보 관리
- 학생 달란트(포인트) 증감 관리
- Google 로그인 기반 접근 제어 및 교사 승인 흐름

## 주요 기능 (기획 기준)
- Google 로그인 후 서비스 접근
- 비로그인 사용자의 모든 경로 접근 시 로그인 페이지로 리다이렉트
- 관리자 교사의 교사 가입 승인/거절
- 학생 관리
- 출석 및 달란트 지급 관리
- 분기별 생일 대상자/출석 요약 대시보드

## 기술 스택
- Framework: Next.js (App Router)
- Language: TypeScript
- Deployment: Vercel
- Auth: Auth.js + Google OAuth
- Database: Neon Postgres
- ORM: Prisma
- Server State: TanStack Query (React Query)
- Client State: Zustand
- Styling: Tailwind CSS, SCSS
- Validation: Zod

## 데이터 모델 (초안)
- `Teacher`
- `Student`
- `ParentContact` (학생 1:1 종속)
- `Attendance`
- `TalentTransaction`

스키마 파일: `prisma/schema.prisma`

## 실행 방법
```bash
yarn install
yarn dev
```

브라우저에서 `http://localhost:3000` 접속.

## 문서
- 기획서(PRD): `docs/PRD.md`
