import type { Metadata } from 'next';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import StudentsResultToast from './StudentsResultToast';
import StudentsView, { getSelectedGradeTab } from './StudentsView';
import TalentResetButton from './TalentResetButton';

export const metadata: Metadata = {
  title: '학생 관리',
};

type StudentsPageProps = {
  searchParams?: Promise<{
    grade_tab?: string | string[];
  }>;
};

/**
 * 학생 관리 페이지를 렌더링한다.
 */
export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedGradeTab = getSelectedGradeTab(resolvedSearchParams?.grade_tab);
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'ADMIN';

  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      address: true,
      phone: true,
      currentTalent: true,
      guardianContact: {
        select: {
          name: true,
          relationship: true,
          phone: true,
        },
      },
    },
  });

  return (
    <>
      <StudentsResultToast />
      <StudentsView
        students={students}
        selectedGradeTab={selectedGradeTab}
        isAdmin={isAdmin}
        canManage
        basePath="/students"
        talentResetSlot={<TalentResetButton />}
      />
    </>
  );
}
