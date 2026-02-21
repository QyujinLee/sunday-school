import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { getServerSession } from 'next-auth';

import AppShell from '@/components/layout/AppShell';
import { authOptions } from '@/lib/auth';

import './globals.css';
import Providers from './providers';

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

/**
 * 앱 전체 공통 레이아웃을 렌더링한다.
 */
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
        <Providers>
          <AppShell role={session?.user?.role} approvalStatus={session?.user?.approvalStatus} userDisplayName={userDisplayName}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
