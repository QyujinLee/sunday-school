import GoogleSignInButton from '@/components/common/GoogleSignInButton';

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--color-surface-soft)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[rgb(var(--color-primary-rgb)/0.2)] blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[rgb(var(--color-accent-rgb)/0.2)] blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">서광주일학교</span>
        </div>

        <h1 className="text-center text-2xl font-bold text-[var(--color-text)] sm:text-3xl">교사 로그인</h1>
        <p className="mt-3 text-center text-sm text-[var(--color-muted)]">구글 계정으로 로그인 후 시스템을 이용할 수 있습니다.</p>

        <div className="mt-8">
          <GoogleSignInButton />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">신규 계정은 관리자 승인 후 이용 가능합니다.</p>
      </section>
    </main>
  );
}
