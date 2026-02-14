import type { ReactNode } from 'react';

import type { Metadata } from 'next';

import localFont from 'next/font/local';
import Image from 'next/image';
import Link from 'next/link';

import { getServerSession } from 'next-auth';

import SignOutButton from '@/components/common/SignOutButton';
import { authOptions } from '@/lib/auth';

import './globals.css';

const pretendard = localFont({
  src: [
    {
      path: '../../public/fonts/Pretendard/woff2-subset/Pretendard-Regular.subset.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Pretendard/woff2-subset/Pretendard-Medium.subset.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Pretendard/woff2-subset/Pretendard-Bold.subset.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
});

export const metadata: Metadata = {
  title: '주일학교 관리 시스템',
  description: '주일학교 출석/학생/교사 관리 시스템',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const userDisplayName = session?.user?.name ?? session?.user?.email ?? '';

  return (
    <html lang="ko" className={pretendard.className}>
      <body>
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
            <Image src="/img/img_main_logo.png" alt="서광주일학교 로고" width={60} height={60} className="h-10 w-10 sm:h-[60px] sm:w-[60px]" priority />
            <Image src="/img/img_main_text_logo.png" alt="서광주일학교" width={147} height={30} className="h-6 w-auto sm:h-[30px]" priority />
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-3 text-sm text-[var(--color-text)]">
              <span>{userDisplayName}</span>
              <SignOutButton />
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]">
              로그인
            </Link>
          )}
        </header>

        {children}
      </body>
    </html>
  );
}
