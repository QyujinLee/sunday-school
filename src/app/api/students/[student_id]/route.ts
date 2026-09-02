import { NextResponse } from 'next/server';

import { requireApprovedTeacher } from '@/lib/api-session';
import { prisma } from '@/lib/prisma';
import {
  type StudentInputPayload,
  parseKstBirthDate,
  parseStudentInput,
  toFieldErrorMap,
} from '@/lib/validation/student';

type RouteContext = {
  params: Promise<{
    student_id: string;
  }>;
};

/**
 * 학생과 보호자 정보를 수정한다.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  const { student_id: studentId } = await context.params;

  if (!studentId) {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  let payload: Partial<StudentInputPayload>;

  try {
    payload = (await request.json()) as Partial<StudentInputPayload>;
  } catch {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  const parsedResult = parseStudentInput(payload);

  if (!parsedResult.success) {
    return NextResponse.json(
      { message: 'invalid_input', errors: toFieldErrorMap(parsedResult.error) },
      { status: 400 }
    );
  }

  const studentInput = parsedResult.data;
  const birthDate = parseKstBirthDate(studentInput.birth_date);

  if (!birthDate) {
    return NextResponse.json(
      { message: 'invalid_input', errors: { birth_date: '생년월일 형식이 올바르지 않습니다.' } },
      { status: 400 }
    );
  }

  const hasGuardianContact = Boolean(
    studentInput.guardian_name && studentInput.guardian_relationship && studentInput.guardian_phone
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: {
          name: studentInput.name,
          gender: studentInput.gender,
          birthDate,
          address: studentInput.address,
          phone: studentInput.phone || null,
        },
      });

      if (hasGuardianContact) {
        await tx.guardianContact.upsert({
          where: { studentId },
          update: {
            name: studentInput.guardian_name!,
            relationship: studentInput.guardian_relationship!,
            phone: studentInput.guardian_phone!,
          },
          create: {
            studentId,
            name: studentInput.guardian_name!,
            relationship: studentInput.guardian_relationship!,
            phone: studentInput.guardian_phone!,
          },
        });
      } else {
        await tx.guardianContact.deleteMany({
          where: { studentId },
        });
      }
    });
  } catch {
    return NextResponse.json({ message: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ message: 'ok' });
}

/**
 * 학생을 삭제한다.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  const { student_id: studentId } = await context.params;

  if (!studentId) {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  try {
    await prisma.student.delete({
      where: { id: studentId },
    });
  } catch {
    return NextResponse.json({ message: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ message: 'ok' });
}
