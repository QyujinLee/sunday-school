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
      className="btn btn-secondary btn-md btn-full cursor-pointer gap-2 rounded-xl"
    >
      <Image src={ico_google} alt="구글 로그인" width={18} height={18} aria-hidden="true" />
      Google로 로그인
    </button>
  );
}
