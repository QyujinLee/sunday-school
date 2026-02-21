import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 날짜를 화면 표시용 문자열로 포맷한다.
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * 가입 상태를 변경한 뒤 페이지 캐시를 갱신한다.
 */
async function updateApprovalStatus(teacherId: string, approvalStatus: 'APPROVED' | 'REJECTED') {
  await prisma.teacher.update({
    where: { id: teacherId },
    data: { approvalStatus },
  });

  revalidatePath('/signup-management');
}

/**
 * 관리자 전용 가입 관리 페이지를 렌더링한다.
 */
export default async function SignupManagementPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }

  /**
   * 선택한 가입 요청을 승인 처리한다.
   */
  async function handleApproveSignup(formData: FormData) {
    'use server';

    const teacherId = formData.get('teacher_id');

    if (typeof teacherId !== 'string' || !teacherId) {
      return;
    }

    await updateApprovalStatus(teacherId, 'APPROVED');
  }

  /**
   * 선택한 가입 요청을 거절 처리한다.
   */
  async function handleRejectSignup(formData: FormData) {
    'use server';

    const teacherId = formData.get('teacher_id');

    if (typeof teacherId !== 'string' || !teacherId) {
      return;
    }

    await updateApprovalStatus(teacherId, 'REJECTED');
  }

  const pendingTeachers = await prisma.teacher.findMany({
    where: { approvalStatus: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const processedTeachers = await prisma.teacher.findMany({
    where: {
      approvalStatus: {
        in: ['APPROVED', 'REJECTED'],
      },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      approvalStatus: true,
      updatedAt: true,
    },
  });

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">가입 관리</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">신규 가입 요청을 승인하거나 거절할 수 있습니다.</p>

        <div className="mt-6 space-y-3">
          {pendingTeachers.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
              현재 승인 대기 중인 계정이 없습니다.
            </p>
          ) : (
            pendingTeachers.map((teacher) => (
              <article
                key={teacher.id}
                className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{teacher.name ?? '이름 미입력'}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{teacher.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">가입 요청: {formatDateTime(teacher.createdAt)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <form action={handleApproveSignup}>
                    <input type="hidden" name="teacher_id" value={teacher.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                    >
                      승인
                    </button>
                  </form>

                  <form action={handleRejectSignup}>
                    <input type="hidden" name="teacher_id" value={teacher.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2"
                    >
                      거절
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h2 className="text-xl font-bold text-[var(--color-text)]">처리된 가입 목록</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">이미 승인되거나 거절된 계정을 확인할 수 있습니다.</p>

        <div className="mt-6 space-y-3">
          {processedTeachers.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
              처리된 계정이 없습니다.
            </p>
          ) : (
            processedTeachers.map((teacher) => {
              const isApproved = teacher.approvalStatus === 'APPROVED';

              return (
                <article
                  key={teacher.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{teacher.name ?? '이름 미입력'}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{teacher.email}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">처리 시각: {formatDateTime(teacher.updatedAt)}</p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                      isApproved
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                    }`}
                  >
                    {isApproved ? '승인됨' : '거절됨'}
                  </span>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
