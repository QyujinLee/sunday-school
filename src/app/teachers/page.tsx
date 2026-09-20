import type { Metadata } from 'next';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import TeachersView from './TeachersView';

export const metadata: Metadata = {
  title: '교사 정보',
};

/**
 * 교사 정보 목록 페이지를 렌더링한다.
 */
export default async function TeachersPage() {
  const session = await getServerSession(authOptions);
  const currentTeacherId = session?.user?.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  const teachers = await prisma.teacher.findMany({
    where: {
      approvalStatus: 'APPROVED',
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      birthDate: true,
      grade: true,
      role: true,
      isActive: true,
    },
  });

  return <TeachersView teachers={teachers} canManageAll={isAdmin} currentTeacherId={currentTeacherId} />;
}
