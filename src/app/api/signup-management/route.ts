import { NextResponse } from 'next/server';

import { requireAdminTeacher } from '@/lib/api-session';
import { prisma } from '@/lib/prisma';
import { TEACHER_APPROVAL_STATUS, TEACHER_ROLE } from '@/types/teacher';

type SignupManagementRequestBody = {
  action?: 'approve' | 'reject' | 'toggle_role' | 'delete';
  teacher_id?: string;
  next_role?: 'ADMIN' | 'TEACHER';
};

/**
 * 관리자 전용 가입 승인/거절/권한 변경/삭제를 처리한다.
 */
export async function POST(request: Request) {
  const guardResult = await requireAdminTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  let body: SignupManagementRequestBody;

  try {
    body = (await request.json()) as SignupManagementRequestBody;
  } catch {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  const teacherId = body.teacher_id;

  if (!teacherId) {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  if (body.action === 'approve' || body.action === 'reject') {
    const approvalStatus =
      body.action === 'approve' ? TEACHER_APPROVAL_STATUS.APPROVED : TEACHER_APPROVAL_STATUS.REJECTED;

    try {
      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          approvalStatus,
          approvalProcessedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          approvalStatus: true,
          role: true,
          approvalProcessedAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        message: 'ok',
        teacher: {
          id: updatedTeacher.id,
          name: updatedTeacher.name,
          email: updatedTeacher.email,
          approvalStatus: updatedTeacher.approvalStatus,
          role: updatedTeacher.role,
          processedAt: (updatedTeacher.approvalProcessedAt ?? updatedTeacher.updatedAt).toISOString(),
        },
      });
    } catch {
      return NextResponse.json({ message: 'server_error' }, { status: 500 });
    }
  }

  if (body.action === 'toggle_role') {
    const nextRole = body.next_role;

    if (nextRole !== TEACHER_ROLE.ADMIN && nextRole !== TEACHER_ROLE.TEACHER) {
      return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
    }

    if (teacherId === guardResult.teacherId && nextRole === TEACHER_ROLE.TEACHER) {
      return NextResponse.json({ message: 'self_protected' }, { status: 400 });
    }

    try {
      await prisma.teacher.update({
        where: { id: teacherId },
        data: { role: nextRole },
      });
    } catch {
      return NextResponse.json({ message: 'server_error' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ok', teacher_id: teacherId, role: nextRole });
  }

  if (body.action === 'delete') {
    if (teacherId === guardResult.teacherId) {
      return NextResponse.json({ message: 'self_protected' }, { status: 400 });
    }

    try {
      await prisma.teacher.delete({
        where: { id: teacherId },
      });
    } catch {
      return NextResponse.json({ message: 'server_error' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ok', teacher_id: teacherId });
  }

  return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
}
