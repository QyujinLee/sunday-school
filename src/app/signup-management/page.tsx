import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TEACHER_ROLE } from '@/types/teacher';

import SignupManagementList from './SignupManagementList';

export const metadata: Metadata = {
  title: '가입 관리',
};

/**
 * 관리자 전용 가입 관리 페이지를 렌더링한다.
 */
export default async function SignupManagementPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== TEACHER_ROLE.ADMIN) {
    redirect('/');
  }

  const [pendingTeachers, processedTeachers] = await Promise.all([
    prisma.teacher.findMany({
      where: { approvalStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.teacher.findMany({
      where: {
        approvalStatus: {
          in: ['APPROVED', 'REJECTED'],
        },
      },
      orderBy: [{ approvalProcessedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        approvalStatus: true,
        role: true,
        approvalProcessedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <SignupManagementList
        currentAdminId={session.user.id ?? ''}
        initialPendingTeachers={pendingTeachers.map((teacher) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          requestedAt: teacher.createdAt.toISOString(),
        }))}
        initialProcessedTeachers={processedTeachers.map((teacher) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          approvalStatus: teacher.approvalStatus,
          role: teacher.role,
          processedAt: (teacher.approvalProcessedAt ?? teacher.updatedAt).toISOString(),
        }))}
      />
    </main>
  );
}
