import { NextResponse } from 'next/server';
import { AttendanceStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  TALENT_ADJUST_VALUES,
  getAttendanceInteractiveData,
  getSelectedAttendanceTab,
  updateAttendanceWithExpectedStatus,
  updateStudentTalent,
} from '@/server/attendance/service';
import { TEACHER_APPROVAL_STATUS } from '@/types/teacher';
import { formatDateToKoreanYmd } from '@/utils/date';

const KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

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
 * 한국 시간 기준 금주 일요일 00:00 값을 반환한다.
 */
function getCurrentSundayKstDate(baseDate: Date = new Date()): Date {
  const todayKoreanYmd = formatDateToKoreanYmd(baseDate);
  const todayKstMidnight = new Date(`${todayKoreanYmd}T00:00:00+09:00`);
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(baseDate);
  const weekdayIndex = KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME[weekdayName] ?? 0;
  const currentSunday = new Date(todayKstMidnight);
  currentSunday.setUTCDate(currentSunday.getUTCDate() - weekdayIndex);
  return currentSunday;
}

/**
 * 다음 주 일요일 00:00 값을 반환한다.
 */
function getNextSundayKstDate(currentSundayKstDate: Date): Date {
  const nextSunday = new Date(currentSundayKstDate);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  return nextSunday;
}

/**
 * 승인된 교사 세션을 검증한다.
 */
async function validateApprovedSession(): Promise<
  | {
      ok: true;
      teacherId: string;
      teacherName: string | null;
      teacherEmail: string | null;
    }
  | {
      ok: false;
      response: NextResponse<{ message: string }>;
    }
> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;

  if (!teacherId) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'forbidden' }, { status: 403 }),
    };
  }

  if (session.user.approvalStatus !== TEACHER_APPROVAL_STATUS.APPROVED) {
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
  };
}

/**
 * 출석 인터랙션 조회 API
 */
export async function GET(request: Request) {
  const validatedSession = await validateApprovedSession();

  if (!validatedSession.ok) {
    return validatedSession.response;
  }

  const url = new URL(request.url);
  const selectedTab = getSelectedAttendanceTab(url.searchParams.get('attendance_tab') ?? undefined);
  const interactiveData = await getAttendanceInteractiveData(selectedTab);

  return NextResponse.json({
    studentsForTable: interactiveData.studentsForTable.map((student) => ({
      ...student,
      birthDate: student.birthDate.toISOString(),
    })),
    talentLogs: interactiveData.talentLogs.map((log) => ({
      ...log,
      transactedAt: log.transactedAt.toISOString(),
    })),
  });
}

/**
 * 출석/달란트 변경 API
 */
export async function POST(request: Request) {
  const validatedSession = await validateApprovedSession();

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
        getCurrentSundayKstDate(),
        body.expected_current_status,
        body.next_status,
        validatedSession.teacherId,
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

    const attendanceDate = getCurrentSundayKstDate();
    const nextSundayDate = getNextSundayKstDate(attendanceDate);

    try {
      const updatedResult = await updateStudentTalent(
        body.student_id,
        Number(amountString),
        validatedSession.teacherId,
        attendanceDate,
        nextSundayDate,
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
