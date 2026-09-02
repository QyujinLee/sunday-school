import type { Metadata } from 'next';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { formatDateToKoreanYmd } from '@/utils/date';

import StudentForm from '../../StudentForm';

export const metadata: Metadata = {
  title: '학생 수정',
};

type StudentEditPageProps = {
  params: Promise<{
    student_id: string;
  }>;
};

/**
 * 학생 수정 페이지를 렌더링한다.
 */
export default async function StudentEditPage({ params }: StudentEditPageProps) {
  const { student_id: studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      guardianContact: true,
    },
  });

  if (!student) {
    redirect('/students');
  }

  const initialValues = {
    name: student.name,
    gender: student.gender,
    birth_date: formatDateToKoreanYmd(student.birthDate),
    address: student.address,
    phone: student.phone ?? '',
    guardian_name: student.guardianContact?.name ?? '',
    guardian_relationship: student.guardianContact?.relationship ?? '',
    guardian_phone: student.guardianContact?.phone ?? '',
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">학생 수정</h1>
          <Link href="/students" prefetch={false} className="btn btn-secondary btn-md">
            목록으로
          </Link>
        </div>

        <StudentForm mode="edit" studentId={studentId} initialValues={initialValues} />
      </section>
    </main>
  );
}
