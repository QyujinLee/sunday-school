'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import SignOutButton from '@/components/common/SignOutButton';
import { getMenuItemsByRole } from '@/lib/menu-items';
import type { TeacherApprovalStatus, TeacherRole } from '@/types/teacher';

type AppShellProps = {
  children: ReactNode;
  role?: TeacherRole;
  approvalStatus?: TeacherApprovalStatus;
  userDisplayName: string;
};

/**
 * 메뉴 URL이 현재 경로와 일치하는지 확인한다.
 */
function isActiveMenu(pathname: string, url: string): boolean {
  if (url.startsWith('http')) {
    return false;
  }

  return pathname === url || pathname.startsWith(`${url}/`);
}

/**
 * 앱 공통 헤더와 반응형 메뉴 셸을 렌더링한다.
 */
export default function AppShell({ children, role, approvalStatus, userDisplayName }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isSignedIn = Boolean(role);
  const isApproved = approvalStatus === 'APPROVED';
  const shouldShowMenu = isSignedIn && isApproved;
  const menuItems = useMemo(() => getMenuItemsByRole(role), [role]);

  /**
   * 모바일 메뉴 열림/닫힘 상태를 토글한다.
   */
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((prevState) => !prevState);
  };

  /**
   * 모바일 메뉴를 닫는다.
   */
  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  /**
   * 메뉴 링크 클릭 시 모바일 메뉴를 닫는다.
   */
  const handleClickMenuItem = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex h-[var(--header-height-mobile)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:h-[var(--header-height-desktop)] sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
          <Image
            src="/img/img_main_logo.png"
            alt="서광주일학교 로고"
            width={60}
            height={60}
            className="h-10 w-10 sm:h-[60px] sm:w-[60px]"
            priority
          />
          <Image
            src="/img/img_main_text_logo.png"
            alt="서광주일학교"
            width={147}
            height={30}
            className="h-6 w-auto sm:h-[30px]"
            priority
          />
        </Link>

        {isSignedIn ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text)] sm:gap-3">
            {shouldShowMenu ? (
              <button
                type="button"
                onClick={handleToggleMobileMenu}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 md:hidden"
                aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={isMobileMenuOpen}
              >
                <FontAwesomeIcon icon={faBars} className="text-[24px]" />
              </button>
            ) : null}
            <span className="hidden sm:inline">{userDisplayName}</span>
            <div className="hidden md:block">
              <SignOutButton />
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            로그인
          </Link>
        )}
      </header>

      {shouldShowMenu ? (
        <div className="flex">
          <aside className="sticky top-[var(--header-height-mobile)] hidden h-[calc(100dvh-var(--header-height-mobile))] w-44 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-4 md:block md:top-[var(--header-height-desktop)] md:h-[calc(100dvh-var(--header-height-desktop))]">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const active = isActiveMenu(pathname, item.url);
                const isExternal = item.url.startsWith('http');

                return (
                  <Link
                    key={item.label}
                    href={item.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer noopener' : undefined}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}

      {shouldShowMenu && isMobileMenuOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-[var(--header-height-mobile)] z-40 md:hidden sm:top-[var(--header-height-desktop)]">
          <button
            type="button"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgb(var(--color-dim-rgb) / 0.62)' }}
            onClick={handleCloseMobileMenu}
            aria-label="메뉴 닫기"
          />
          <aside className="relative ml-auto flex h-full w-48 max-w-[64vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const active = isActiveMenu(pathname, item.url);
                const isExternal = item.url.startsWith('http');

                return (
                  <Link
                    key={item.label}
                    href={item.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer noopener' : undefined}
                    onClick={handleClickMenuItem}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-3">
              <SignOutButton className="w-full" />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
