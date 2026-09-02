import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { TEACHER_APPROVAL_STATUS, TEACHER_ROLE } from '@/types/teacher';

type ApprovedTeacherSession = {
  teacherId: string;
  teacherName: string | null;
  teacherEmail: string | null;
  isAdmin: boolean;
};

type SessionGuardResult =
  | ({ ok: true } & ApprovedTeacherSession)
  | { ok: false; response: NextResponse<{ message: string }> };

/**
 * 승인 상태가 APPROVED인 교사 세션인지 검증한다.
 */
export async function requireApprovedTeacher(): Promise<SessionGuardResult> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;

  if (!teacherId || session.user.approvalStatus !== TEACHER_APPROVAL_STATUS.APPROVED) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'forbidden' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    teacherId,
    teacherName: session.user.name ?? null,
    teacherEmail: session.user.email ?? null,
    isAdmin: session.user.role === TEACHER_ROLE.ADMIN,
  };
}

/**
 * 승인된 관리자 교사 세션인지 검증한다.
 */
export async function requireAdminTeacher(): Promise<SessionGuardResult> {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult;
  }

  if (!guardResult.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'forbidden' }, { status: 403 }),
    };
  }

  return guardResult;
}
