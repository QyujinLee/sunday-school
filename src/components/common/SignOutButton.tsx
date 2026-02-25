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
      className={`btn btn-secondary btn-md ${className}`}
    >
      로그아웃
    </button>
  );
}
