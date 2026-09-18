import type { ReactNode } from 'react';

import Link from 'next/link';

/**
 * 게스트 모드 화면에 예시 데이터임을 알리는 배너를 공통으로 씌운다.
 */
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 py-2 text-center text-xs text-[var(--color-primary)] sm:px-6 sm:text-sm">
        <span className="font-semibold">게스트 모드</span> · 예시 데이터이며 실제 학생·교사 정보가 아닙니다.{' '}
        <Link href="/login" prefetch={false} className="underline underline-offset-2">
          로그인하기
        </Link>
      </div>
      {children}
    </>
  );
}
