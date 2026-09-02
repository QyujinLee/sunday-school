import type { Metadata } from 'next';

import Link from 'next/link';

import StudentForm from '../StudentForm';

export const metadata: Metadata = {
  title: '학생 등록',
};

const EMPTY_STUDENT_FORM_VALUES = {
  name: '',
  gender: '',
  birth_date: '',
  address: '',
  phone: '',
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
};

/**
 * 학생 등록 페이지를 렌더링한다.
 */
export default function StudentCreatePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">학생 등록</h1>
          <Link href="/students" prefetch={false} className="btn btn-secondary btn-md">
            목록으로
          </Link>
        </div>

        <StudentForm mode="create" initialValues={EMPTY_STUDENT_FORM_VALUES} />
      </section>
    </main>
  );
}
