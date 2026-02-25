import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSession } from 'next-auth';

import DeleteTeacherButton from '@/components/common/DeleteTeacherButton';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SignupManagementResultToast from './SignupManagementResultToast';

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
 * 교사 권한을 변경한 뒤 페이지 캐시를 갱신한다.
 */
async function updateTeacherRole(teacherId: string, role: 'ADMIN' | 'TEACHER') {
  await prisma.teacher.update({
    where: { id: teacherId },
    data: { role },
  });

  revalidatePath('/signup-management');
}

/**
 * 가입된 교사 계정을 삭제한 뒤 페이지 캐시를 갱신한다.
 */
async function deleteJoinedTeacher(teacherId: string) {
  await prisma.teacher.delete({
    where: { id: teacherId },
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

  const currentAdminId = session.user?.id;

  /**
   * 선택한 가입 요청을 승인 처리한다.
   */
  async function handleApproveSignup(formData: FormData) {
    'use server';

    const sessionForAction = await getServerSession(authOptions);

    if (sessionForAction?.user?.role !== 'ADMIN') {
      redirect('/signup-management?error_code=forbidden');
    }

    const teacherId = formData.get('teacher_id');

    if (typeof teacherId !== 'string' || !teacherId) {
      redirect('/signup-management?error_code=invalid_request');
    }

    try {
      await updateApprovalStatus(teacherId, 'APPROVED');
    } catch {
      redirect('/signup-management?error_code=server_error');
    }

    redirect('/signup-management?success_code=signup_approved');
  }

  /**
   * 선택한 가입 요청을 거절 처리한다.
   */
  async function handleRejectSignup(formData: FormData) {
    'use server';

    const sessionForAction = await getServerSession(authOptions);

    if (sessionForAction?.user?.role !== 'ADMIN') {
      redirect('/signup-management?error_code=forbidden');
    }

    const teacherId = formData.get('teacher_id');

    if (typeof teacherId !== 'string' || !teacherId) {
      redirect('/signup-management?error_code=invalid_request');
    }

    try {
      await updateApprovalStatus(teacherId, 'REJECTED');
    } catch {
      redirect('/signup-management?error_code=server_error');
    }

    redirect('/signup-management?success_code=signup_rejected');
  }

  /**
   * 승인된 계정의 관리자 권한을 토글한다.
   */
  async function handleToggleAdminRole(formData: FormData) {
    'use server';

    const sessionForAction = await getServerSession(authOptions);

    if (sessionForAction?.user?.role !== 'ADMIN') {
      redirect('/signup-management?error_code=forbidden');
    }

    const teacherId = formData.get('teacher_id');
    const nextRole = formData.get('next_role');

    if (typeof teacherId !== 'string' || !teacherId) {
      redirect('/signup-management?error_code=invalid_request');
    }

    if (nextRole !== 'ADMIN' && nextRole !== 'TEACHER') {
      redirect('/signup-management?error_code=invalid_request');
    }

    if (teacherId === currentAdminId && nextRole === 'TEACHER') {
      redirect('/signup-management?error_code=self_protected');
    }

    try {
      await updateTeacherRole(teacherId, nextRole);
    } catch {
      redirect('/signup-management?error_code=server_error');
    }

    redirect('/signup-management?success_code=role_updated');
  }

  /**
   * 승인된 계정을 삭제한다.
   */
  async function handleDeleteJoinedTeacher(formData: FormData) {
    'use server';

    const sessionForAction = await getServerSession(authOptions);

    if (sessionForAction?.user?.role !== 'ADMIN') {
      redirect('/signup-management?error_code=forbidden');
    }

    const teacherId = formData.get('teacher_id');

    if (typeof teacherId !== 'string' || !teacherId) {
      redirect('/signup-management?error_code=invalid_request');
    }

    if (teacherId === sessionForAction.user.id) {
      redirect('/signup-management?error_code=self_protected');
    }

    try {
      await deleteJoinedTeacher(teacherId);
    } catch {
      redirect('/signup-management?error_code=server_error');
    }

    redirect('/signup-management?success_code=teacher_deleted');
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
      role: true,
      updatedAt: true,
    },
  });

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <SignupManagementResultToast />
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
                      className="btn btn-primary btn-md"
                    >
                      승인
                    </button>
                  </form>

                  <form action={handleRejectSignup}>
                    <input type="hidden" name="teacher_id" value={teacher.id} />
                    <button
                      type="submit"
                      className="btn btn-danger btn-md"
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
        <h2 className="text-xl font-bold text-[var(--color-text)]">처리된 가입 목록 / 권한 관리</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          승인된 계정은 역할 변경과 삭제가 가능하며, 거절된 계정은 상태만 확인할 수 있습니다.
        </p>

        <div className="mt-6 space-y-3">
          {processedTeachers.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
              처리된 계정이 없습니다.
            </p>
          ) : (
            processedTeachers.map((teacher) => {
              const isApproved = teacher.approvalStatus === 'APPROVED';
              const isAdmin = teacher.role === 'ADMIN';
              const isMe = teacher.id === currentAdminId;
              const nextRole = isAdmin ? 'TEACHER' : 'ADMIN';

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

                  <div className="flex flex-col items-start gap-2 sm:ml-auto sm:items-end">
                    {!isApproved ? (
                      <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]">
                        거절됨
                      </span>
                    ) : null}

                    {isApproved ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            isAdmin
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                              : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-muted)]'
                          }`}
                        >
                          {isAdmin ? '관리자' : '일반 교사'}
                        </span>

                        <form action={handleToggleAdminRole}>
                          <input type="hidden" name="teacher_id" value={teacher.id} />
                          <input type="hidden" name="next_role" value={nextRole} />
                          <button
                            type="submit"
                            disabled={isMe && isAdmin}
                            className="btn btn-secondary btn-sm h-8"
                          >
                            {isAdmin ? '관리자 해제' : '관리자 부여'}
                          </button>
                        </form>

                        <form id={`delete-joined-teacher-form-${teacher.id}`} action={handleDeleteJoinedTeacher}>
                          <input type="hidden" name="teacher_id" value={teacher.id} />
                          <DeleteTeacherButton deleteFormId={`delete-joined-teacher-form-${teacher.id}`} disabled={isMe} />
                        </form>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
