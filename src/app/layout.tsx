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
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: '서광 주일학교 관리 시스템',
    template: '%s | 서광 주일학교 관리 시스템',
  },
  description: '주일학교 출석, 학생, 교사, 가입 승인을 한 곳에서 관리하는 시스템입니다.',
  openGraph: {
    title: '서광 주일학교 관리 시스템',
    description: '주일학교 출석, 학생, 교사, 가입 승인을 한 곳에서 관리하는 시스템입니다.',
    type: 'website',
    locale: 'ko_KR',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: '서광 주일학교 관리 시스템',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '서광 주일학교 관리 시스템',
    description: '주일학교 출석, 학생, 교사, 가입 승인을 한 곳에서 관리하는 시스템입니다.',
    images: ['/opengraph-image'],
  },
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
