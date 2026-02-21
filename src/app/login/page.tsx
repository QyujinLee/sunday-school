import GoogleSignInButton from '@/components/common/GoogleSignInButton';

type LoginPageProps = {
  searchParams?: Promise<{ callback_url?: string | string[] }>;
};

/**
 * 로그인 완료 후 이동할 callback URL을 안전하게 정규화한다.
 */
function getSafeCallbackUrl(callbackUrl: string | string[] | undefined): string {
  const resolvedValue = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  if (!resolvedValue || !resolvedValue.startsWith('/')) {
    return '/';
  }

  return resolvedValue;
}

/**
 * 로그인 페이지를 렌더링하고 callback_url을 로그인 버튼으로 전달한다.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = getSafeCallbackUrl(resolvedSearchParams?.callback_url);

  return (
    <main className="relative grid min-h-[calc(100dvh-var(--header-height-mobile))] place-items-center overflow-hidden bg-[var(--color-surface-soft)] px-4 py-6 sm:min-h-[calc(100dvh-var(--header-height-desktop))] sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[rgb(var(--color-primary-rgb)/0.2)] blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[rgb(var(--color-accent-rgb)/0.2)] blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-6 shadow-xl backdrop-blur sm:p-8">
        <h1 className="text-center text-2xl font-bold text-[var(--color-text)] sm:text-3xl">교사 로그인</h1>
        <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
          구글 계정으로 로그인 후 시스템을 이용할 수 있습니다.
        </p>

        <div className="mt-8">
          <GoogleSignInButton callbackUrl={callbackUrl} />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          신규 계정은 관리자 승인 후 이용 가능합니다.
        </p>
      </section>
    </main>
  );
}
