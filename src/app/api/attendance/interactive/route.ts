import { NextResponse } from 'next/server';

import { AttendanceStatus } from '@prisma/client';

import { requireApprovedTeacher } from '@/lib/api-session';
import { getAttendancePeriodInfo, getSelectedAttendanceTab } from '@/lib/attendance';
import {
  TALENT_ADJUST_VALUES,
  getAttendanceInteractiveData,
  updateAttendanceWithExpectedStatus,
  updateStudentTalent,
} from '@/server/attendance/service';

type ToggleAttendanceRequestBody = {
  action: 'toggle_attendance';
  student_id?: string;
  expected_current_status?: AttendanceStatus;
  next_status?: AttendanceStatus;
};

type AdjustTalentRequestBody = {
  action: 'adjust_talent';
  student_id?: string;
  amount?: number;
};

/**
 * 출석 인터랙션 조회 API
 */
export async function GET(request: Request) {
  const validatedSession = await requireApprovedTeacher();

  if (!validatedSession.ok) {
    return validatedSession.response;
  }

  const url = new URL(request.url);
  const selectedTab = getSelectedAttendanceTab(url.searchParams.get('attendance_tab') ?? undefined);

  // Date 값은 JSON 직렬화 시 ISO 문자열로 변환된다.
  return NextResponse.json(await getAttendanceInteractiveData(selectedTab));
}

/**
 * 출석/달란트 변경 API
 */
export async function POST(request: Request) {
  const validatedSession = await requireApprovedTeacher();

  if (!validatedSession.ok) {
    return validatedSession.response;
  }

  let body: ToggleAttendanceRequestBody | AdjustTalentRequestBody;

  try {
    body = (await request.json()) as ToggleAttendanceRequestBody | AdjustTalentRequestBody;
  } catch {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  if (body.action === 'toggle_attendance') {
    if (
      !body.student_id ||
      (body.expected_current_status !== AttendanceStatus.PRESENT &&
        body.expected_current_status !== AttendanceStatus.ABSENT) ||
      (body.next_status !== AttendanceStatus.PRESENT && body.next_status !== AttendanceStatus.ABSENT)
    ) {
      return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
    }

    try {
      const result = await updateAttendanceWithExpectedStatus(
        body.student_id,
        getAttendancePeriodInfo().attendanceDate,
        body.expected_current_status,
        body.next_status,
        validatedSession.teacherId
      );

      if (result.result === 'stale_state') {
        return NextResponse.json({ message: 'stale_state' }, { status: 409 });
      }

      return NextResponse.json({
        message: 'ok',
        student_id: body.student_id,
        next_status: result.nextStatus,
        current_talent: result.currentTalent,
        talent_delta: result.talentDelta,
      });
    } catch {
      return NextResponse.json({ message: 'server_error' }, { status: 500 });
    }
  }

  if (body.action === 'adjust_talent') {
    const amountString = String(body.amount ?? '');
    if (!body.student_id || !TALENT_ADJUST_VALUES.has(amountString)) {
      return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
    }

    const { attendanceDate, nextSundayDate } = getAttendancePeriodInfo();

    try {
      const updatedResult = await updateStudentTalent(
        body.student_id,
        Number(amountString),
        validatedSession.teacherId,
        attendanceDate,
        nextSundayDate
      );

      return NextResponse.json({
        message: 'ok',
        student_id: updatedResult.studentId,
        student_name: updatedResult.studentName,
        current_talent: updatedResult.currentTalent,
        weekly_extra_talent: updatedResult.weeklyExtraTalent,
        transaction: {
          id: updatedResult.transaction.id,
          amount: updatedResult.transaction.amount,
          transacted_at: updatedResult.transaction.transactedAt.toISOString(),
          teacher: {
            name: validatedSession.teacherName,
            email: validatedSession.teacherEmail,
          },
        },
      });
    } catch {
      return NextResponse.json({ message: 'server_error' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
}
