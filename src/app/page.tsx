import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getMenuItemsByRole } from '@/lib/menu-items';

/**
 * 사용자 권한에 따라 홈 메뉴 카드를 렌더링한다.
 */
export default async function Page() {
  const session = await getServerSession(authOptions);
  const homeMenuItems = getMenuItemsByRole(session?.user?.role);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-[680px] rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="grid grid-cols-[repeat(2,minmax(140px,160px))] justify-center gap-4 md:grid-cols-[repeat(3,minmax(140px,160px))]">
          {homeMenuItems.map((item) => {
            const isExternal = item.url.startsWith('http');

            return (
              <Link
                key={item.label}
                href={item.url}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
                className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-soft-hover)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              >
                <span className="inline-flex items-center justify-center rounded-xl text-[var(--color-text)] transition">
                  <FontAwesomeIcon icon={item.icon} className="h-10 w-10" />
                </span>
                <span className="text-sm font-semibold text-[var(--color-text)] sm:text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
