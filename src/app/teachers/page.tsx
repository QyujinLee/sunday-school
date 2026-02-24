import Link from 'next/link';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDateToKoreanYmd } from '@/utils/date';
import TeachersResultToast from './TeachersResultToast';

type TeacherRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  birthDate: Date | null;
  grade: string | null;
  role: 'ADMIN' | 'TEACHER';
  isActive: boolean;
};

const EDIT_BUTTON_CLASS_NAME =
  'inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2';

/**
 * 교사 역할 코드를 사용자 표시용 문자열로 변환한다.
 */
function getRoleLabel(role: TeacherRow['role']): string {
  return role === 'ADMIN' ? '관리자' : '교사';
}

/**
 * 교사 테이블 본문 행 목록을 렌더링한다.
 */
function TeacherTableRows({
  teachers,
  canManageAll,
  currentTeacherId,
}: {
  teachers: TeacherRow[];
  canManageAll: boolean;
  currentTeacherId?: string;
}) {
  if (teachers.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-3 py-3 text-center text-sm text-[var(--color-muted)]">
          표시할 교사 정보가 없습니다.
        </td>
      </tr>
    );
  }

  return teachers.map((teacher) => {
    const canEdit = canManageAll || currentTeacherId === teacher.id;

    return (
      <tr key={teacher.id} className="border-t border-[var(--color-border)]">
        <td className="px-3 py-2 text-sm text-[var(--color-text)]">{teacher.name ?? '-'}</td>
        <td className="px-3 py-2 text-sm text-[var(--color-muted)]">{teacher.email}</td>
        <td className="px-3 py-2 text-sm text-[var(--color-muted)]">{teacher.phone ?? '-'}</td>
        <td className="px-3 py-2 text-sm text-[var(--color-muted)]">
          {teacher.birthDate ? formatDateToKoreanYmd(teacher.birthDate) : '-'}
        </td>
        <td className="px-3 py-2 text-sm text-[var(--color-muted)]">{teacher.grade ?? '-'}</td>
        <td className="px-3 py-2 text-sm text-[var(--color-text)]">{getRoleLabel(teacher.role)}</td>
        <td className="px-3 py-2 text-sm text-[var(--color-text)]">
          {canEdit ? (
            <Link href={`/teachers/${teacher.id}/edit`} className={EDIT_BUTTON_CLASS_NAME}>
              수정
            </Link>
          ) : (
            '-'
          )}
        </td>
      </tr>
    );
  });
}

/**
 * 교사 모바일 카드 목록을 렌더링한다.
 */
function TeacherCardList({
  teachers,
  canManageAll,
  currentTeacherId,
}: {
  teachers: TeacherRow[];
  canManageAll: boolean;
  currentTeacherId?: string;
}) {
  if (teachers.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        표시할 교사 정보가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {teachers.map((teacher) => {
        const canEdit = canManageAll || currentTeacherId === teacher.id;

        return (
          <li key={teacher.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-[var(--color-text)]">{teacher.name ?? '-'}</p>
              <p className="text-xs font-medium text-[var(--color-muted)]">{getRoleLabel(teacher.role)}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-[var(--color-muted)]">이메일</dt>
              <dd className="truncate text-right text-[var(--color-text)]">{teacher.email}</dd>
              <dt className="text-[var(--color-muted)]">연락처</dt>
              <dd className="text-right text-[var(--color-text)]">{teacher.phone ?? '-'}</dd>
              <dt className="text-[var(--color-muted)]">생년월일</dt>
              <dd className="text-right text-[var(--color-text)]">
                {teacher.birthDate ? formatDateToKoreanYmd(teacher.birthDate) : '-'}
              </dd>
              <dt className="text-[var(--color-muted)]">담당 학년</dt>
              <dd className="text-right text-[var(--color-text)]">{teacher.grade ?? '-'}</dd>
            </dl>

            {canEdit ? (
              <div className="mt-3 flex justify-end">
                <Link href={`/teachers/${teacher.id}/edit`} className={EDIT_BUTTON_CLASS_NAME}>
                  수정
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 교사 정보 목록 페이지를 렌더링한다.
 */
export default async function TeachersPage() {
  const session = await getServerSession(authOptions);
  const currentTeacherId = session?.user?.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  const teachers = await prisma.teacher.findMany({
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

  const activeTeachers = teachers.filter((teacher) => teacher.isActive);
  const inactiveTeachers = teachers.filter((teacher) => !teacher.isActive);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <TeachersResultToast />

      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">교사 정보</h1>
          <p className="text-sm text-[var(--color-muted)]">활성 {activeTeachers.length}명</p>
        </div>

        <div className="mt-5 sm:hidden">
          <TeacherCardList teachers={activeTeachers} canManageAll={isAdmin} currentTeacherId={currentTeacherId} />
        </div>

        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          <table className="w-full border-collapse text-center">
            <thead className="bg-[var(--color-surface-soft)]">
              <tr>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">이메일</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">연락처</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">생년월일</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">담당 학년</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">역할</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">관리</th>
              </tr>
            </thead>
            <tbody>
              <TeacherTableRows teachers={activeTeachers} canManageAll={isAdmin} currentTeacherId={currentTeacherId} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--color-text)]">비활성 교사</h2>
          <p className="text-sm text-[var(--color-muted)]">{inactiveTeachers.length}명</p>
        </div>

        <div className="mt-5 sm:hidden">
          <TeacherCardList teachers={inactiveTeachers} canManageAll={isAdmin} currentTeacherId={currentTeacherId} />
        </div>

        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          <table className="w-full border-collapse text-center">
            <thead className="bg-[var(--color-surface-soft)]">
              <tr>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">이메일</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">연락처</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">생년월일</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">담당 학년</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">역할</th>
                <th className="px-3 py-2 text-sm font-semibold text-[var(--color-text)]">관리</th>
              </tr>
            </thead>
            <tbody>
              <TeacherTableRows teachers={inactiveTeachers} canManageAll={isAdmin} currentTeacherId={currentTeacherId} />
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
