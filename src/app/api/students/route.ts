import { NextResponse } from 'next/server';

import { requireApprovedTeacher } from '@/lib/api-session';
import { prisma } from '@/lib/prisma';
import {
  type StudentInputPayload,
  parseKstBirthDate,
  parseStudentInput,
  toFieldErrorMap,
} from '@/lib/validation/student';

/**
 * 학생과 보호자 정보를 생성한다.
 */
export async function POST(request: Request) {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
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
    const createdStudent = await prisma.student.create({
      data: {
        name: studentInput.name,
        gender: studentInput.gender,
        birthDate,
        address: studentInput.address,
        phone: studentInput.phone || null,
        guardianContact: hasGuardianContact
          ? {
              create: {
                name: studentInput.guardian_name!,
                relationship: studentInput.guardian_relationship!,
                phone: studentInput.guardian_phone!,
              },
            }
          : undefined,
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({ message: 'ok', student_id: createdStudent.id, student_name: createdStudent.name });
  } catch {
    return NextResponse.json({ message: 'server_error' }, { status: 500 });
  }
}
