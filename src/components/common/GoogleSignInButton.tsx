'use client';

import { useEffect, useMemo } from 'react';

import Image from 'next/image';

import { signIn } from 'next-auth/react';

import ico_google from '~/public/icon/ico_google.svg';

type GoogleSignInButtonProps = {
  callbackUrl?: string;
};

type BrowserContext = {
  isInAppBrowser: boolean;
  isMobile: boolean;
  isAndroid: boolean;
};

/**
 * User-Agent 문자열에서 인앱 브라우저 여부를 판별한다.
 */
function detectBrowserContext(userAgent: string): BrowserContext {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod/i.test(normalizedUserAgent);
  const isAndroid = /android/i.test(normalizedUserAgent);
  const isInAppBrowser =
    /(kakaotalk|fbav|fban|instagram|line|naver|daumapps|wv)/i.test(normalizedUserAgent) ||
    (isAndroid && /; wv\)/i.test(normalizedUserAgent));

  return {
    isInAppBrowser,
    isMobile,
    isAndroid,
  };
}

/**
 * 현재 URL을 Android Chrome intent URL로 변환한다.
 */
function buildAndroidChromeIntentUrl(currentUrl: string): string {
  const normalizedUrl = currentUrl.replace(/^https?:\/\//i, '');
  return `intent://${normalizedUrl}#Intent;scheme=https;package=com.android.chrome;end`;
}

/**
 * Google OAuth 로그인을 시작하는 버튼을 렌더링한다.
 */
export default function GoogleSignInButton({ callbackUrl = '/' }: GoogleSignInButtonProps) {
  const safeCallbackUrl = useMemo(() => (callbackUrl.startsWith('/') ? callbackUrl : '/'), [callbackUrl]);
  const browserContext = useMemo(
    () =>
      typeof window === 'undefined'
        ? {
            isInAppBrowser: false,
            isMobile: false,
            isAndroid: false,
          }
        : detectBrowserContext(window.navigator.userAgent),
    [],
  );

  /**
   * 인앱 브라우저에서 외부 브라우저 열기를 시도한다.
   */
  function handleOpenExternalBrowser() {
    const currentUrl = window.location.href;

    if (browserContext.isAndroid) {
      const intentUrl = buildAndroidChromeIntentUrl(currentUrl);
      window.location.href = intentUrl;
      window.setTimeout(() => {
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
      }, 500);
      return;
    }

    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  }

  useEffect(() => {
    if (!browserContext.isInAppBrowser || !browserContext.isMobile) {
      return;
    }

    if (window.sessionStorage.getItem('external_browser_open_attempted') === '1') {
      return;
    }

    window.sessionStorage.setItem('external_browser_open_attempted', '1');
    handleOpenExternalBrowser();
  }, [browserContext.isInAppBrowser, browserContext.isMobile, browserContext.isAndroid]);

  /**
   * 검증된 callback URL로 Google OAuth 로그인을 시작한다.
   */
  async function handleSignInClick() {
    await signIn('google', { callbackUrl: safeCallbackUrl });
  }

  if (browserContext.isInAppBrowser) {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)]/35 p-4">
        <p className="text-sm font-medium text-[var(--color-danger)]">
          현재 인앱 브라우저에서는 Google 로그인이 차단될 수 있습니다.
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          Chrome 또는 Safari 같은 기본 브라우저에서 다시 열어 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={handleOpenExternalBrowser}
          className="btn btn-secondary btn-md btn-full"
        >
          외부 브라우저로 열기
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignInClick}
      className="btn btn-secondary btn-google btn-md btn-full cursor-pointer gap-2 rounded-xl"
    >
      <Image src={ico_google} alt="구글 로그인" width={18} height={18} aria-hidden="true" />
      Google로 로그인
    </button>
  );
}
