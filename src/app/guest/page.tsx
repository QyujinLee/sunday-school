import type { Metadata } from 'next';

import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { GUEST_MENU_ITEMS } from '@/lib/menu-items';

export const metadata: Metadata = {
  title: '게스트 둘러보기',
};

/**
 * 로그인 없이 둘러볼 수 있는 게스트 홈 메뉴를 렌더링한다.
 */
export default function GuestHomePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-[680px] rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="grid grid-cols-[repeat(2,minmax(140px,160px))] justify-center gap-4 md:grid-cols-[repeat(3,minmax(140px,160px))]">
          {GUEST_MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.url}
              prefetch={false}
              className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-soft-hover)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              <span className="inline-flex items-center justify-center rounded-xl text-[var(--color-text)] transition">
                <FontAwesomeIcon icon={item.icon} className="h-10 w-10" />
              </span>
              <span className="text-sm font-semibold text-[var(--color-text)] sm:text-base">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
