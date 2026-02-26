import type { Metadata } from 'next';
import Link from 'next/link';

const RECREATION_TOOL_KEYS = ['number_baseball', 'timer'] as const;
type RecreationToolKey = (typeof RECREATION_TOOL_KEYS)[number];

type RecreationPageProps = {
  searchParams?: Promise<{
    tool_tab?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: '레크레이션',
};

/**
 * URL 쿼리에서 유효한 레크레이션 탭 값을 반환한다.
 */
function getSelectedRecreationTool(toolTab: string | string[] | undefined): RecreationToolKey {
  const resolvedToolTab = Array.isArray(toolTab) ? toolTab[0] : toolTab;

  if (resolvedToolTab && RECREATION_TOOL_KEYS.includes(resolvedToolTab as RecreationToolKey)) {
    return resolvedToolTab as RecreationToolKey;
  }

  return 'number_baseball';
}

/**
 * 레크레이션 허브 페이지를 렌더링한다.
 */
export default async function RecreationPage({ searchParams }: RecreationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTool = getSelectedRecreationTool(resolvedSearchParams?.tool_tab);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">레크레이션</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          숫자야구와 타이머를 상황에 맞게 바로 실행할 수 있습니다.
        </p>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="레크레이션 도구 탭">
          <Link
            href="/recreation?tool_tab=number_baseball"
            prefetch={false}
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              selectedTool === 'number_baseball'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
            }`}
            aria-current={selectedTool === 'number_baseball' ? 'page' : undefined}
          >
            숫자야구
          </Link>
          <Link
            href="/recreation?tool_tab=timer"
            prefetch={false}
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              selectedTool === 'timer'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
            }`}
            aria-current={selectedTool === 'timer' ? 'page' : undefined}
          >
            타이머
          </Link>
        </nav>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article
            className={`rounded-xl border p-5 ${
              selectedTool === 'number_baseball'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-soft)]'
            }`}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">숫자야구</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              팀별로 독립된 보드에서 4자리 숫자를 추리할 수 있습니다.
            </p>
            <Link href="/recreation/number-baseball" prefetch={false} className="btn btn-primary btn-md mt-4">
              시작하기
            </Link>
          </article>

          <article
            className={`rounded-xl border p-5 ${
              selectedTool === 'timer'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-soft)]'
            }`}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">타이머</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              `HH:MM:SS` 형식으로 입력해 진행 시간을 제어할 수 있습니다.
            </p>
            <Link href="/recreation/timer" prefetch={false} className="btn btn-primary btn-md mt-4">
              시작하기
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
