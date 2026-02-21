'use client';

import { useMemo } from 'react';

import Image from 'next/image';

import { signIn } from 'next-auth/react';

import ico_google from '~/public/icon/ico_google.svg';

type GoogleSignInButtonProps = {
  callbackUrl?: string;
};

/**
 * Google OAuth 로그인을 시작하는 버튼을 렌더링한다.
 */
export default function GoogleSignInButton({ callbackUrl = '/' }: GoogleSignInButtonProps) {
  const safeCallbackUrl = useMemo(() => (callbackUrl.startsWith('/') ? callbackUrl : '/'), [callbackUrl]);

  /**
   * 검증된 callback URL로 Google OAuth 로그인을 시작한다.
   */
  const handleSignInClick = async () => {
    await signIn('google', { callbackUrl: safeCallbackUrl });
  };

  return (
    <button
      type="button"
      onClick={handleSignInClick}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] shadow-sm transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      <Image src={ico_google} alt="구글 로그인" width={18} height={18} aria-hidden="true" />
      Google로 로그인
    </button>
  );
}
