import SignOutButton from '@/components/common/SignOutButton';

export default function PendingPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">승인 대기 중입니다</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">관리자 교사가 가입을 승인하면 접근이 가능합니다.</p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
