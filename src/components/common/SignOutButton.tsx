'use client';

import { signOut } from 'next-auth/react';

type SignOutButtonProps = {
  className?: string;
};

/**
 * 로그아웃 버튼을 렌더링한다.
 */
export default function SignOutButton({ className = '' }: SignOutButtonProps) {
  /**
   * 로그아웃 처리 후 로그인 페이지로 이동한다.
   */
  const handleSignOutClick = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      type="button"
      onClick={handleSignOutClick}
      className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${className}`}
    >
      로그아웃
    </button>
  );
}
