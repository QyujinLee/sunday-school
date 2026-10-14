import { NextResponse } from 'next/server';

import { requireApprovedTeacher } from '@/lib/api-session';
import { isRecordNotFoundError, prisma } from '@/lib/prisma';
import { toFieldErrorMap } from '@/lib/validation/student';
import { type TeacherUpdatePayload, parseTeacherUpdateInput } from '@/lib/validation/teacher';

type RouteContext = {
  params: Promise<{
    teacher_id: string;
  }>;
};

/**
 * 교사 정보를 수정한다. 관리자이거나 본인 계정일 때만 허용한다.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  const { teacher_id: teacherId } = await context.params;
  const isSelf = guardResult.teacherId === teacherId;

  if (!teacherId || (!guardResult.isAdmin && !isSelf)) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  let payload: Partial<TeacherUpdatePayload>;

  try {
    payload = (await request.json()) as Partial<TeacherUpdatePayload>;
  } catch {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  // 비활성 교사는 서비스에서 차단되므로, 관리자가 자기 계정을 비활성화해 스스로 잠기지 않도록 본인 계정은 제외한다.
  const canChangeActiveState = guardResult.isAdmin && !isSelf;
  const parsedResult = parseTeacherUpdateInput(payload, canChangeActiveState);

  if (!parsedResult.success) {
    return NextResponse.json(
      { message: 'invalid_input', errors: toFieldErrorMap(parsedResult.error) },
      { status: 400 }
    );
  }

  const teacherInput = parsedResult.data;
  const birthDate = teacherInput.birth_date ? new Date(`${teacherInput.birth_date}T00:00:00+09:00`) : null;

  if (birthDate && Number.isNaN(birthDate.getTime())) {
    return NextResponse.json(
      { message: 'invalid_input', errors: { birth_date: '생년월일 형식이 올바르지 않습니다.' } },
      { status: 400 }
    );
  }

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        name: teacherInput.name,
        phone: teacherInput.phone || null,
        birthDate,
        grade: teacherInput.grade ?? null,
        // 활성 상태는 관리자가 다른 교사에게만 변경할 수 있어 그 외 요청에서는 필드를 건드리지 않는다.
        ...(canChangeActiveState ? { isActive: Boolean(teacherInput.is_active) } : {}),
      },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ message: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ message: 'ok' });
}
