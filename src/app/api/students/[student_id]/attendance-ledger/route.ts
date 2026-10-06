import { NextResponse } from 'next/server';

import { AttendanceStatus } from '@prisma/client';

import { requireApprovedTeacher } from '@/lib/api-session';
import { prisma } from '@/lib/prisma';
import { addWeeks, formatDateToKoreanYmd, getFirstSundayOfMonthKst, getLastSundayOfMonthKst } from '@/utils/date';
import { getSchoolYearInKst } from '@/utils/grade';

type RouteContext = {
  params: Promise<{
    student_id: string;
  }>;
};

/**
 * 시작/종료 일요일 사이의 주차 목록(양 끝 포함)을 반환한다.
 */
function getSundaySeriesBetween(startSunday: Date, endSunday: Date): Date[] {
  const result: Date[] = [];
  let cursor = startSunday;

  while (cursor <= endSunday) {
    result.push(cursor);
    cursor = addWeeks(cursor, 1);
  }

  return result;
}

/**
 * 학생별 학사연도 출석부 데이터를 반환한다.
 */
export async function GET(_request: Request, context: RouteContext) {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  const { student_id: studentId } = await context.params;

  if (!studentId) {
    return NextResponse.json({ message: 'invalid_request' }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!student) {
    return NextResponse.json({ message: 'not_found' }, { status: 404 });
  }

  const schoolYearStart = getSchoolYearInKst();
  const schoolYearEnd = schoolYearStart + 1;
  const firstSunday = getFirstSundayOfMonthKst(schoolYearStart, 3);
  const lastSunday = getLastSundayOfMonthKst(schoolYearEnd, 2);
  const weeks = getSundaySeriesBetween(firstSunday, lastSunday).map((weekDate) => {
    const ymd = formatDateToKoreanYmd(weekDate);

    return {
      date: ymd,
      label: ymd.slice(5).replace('-', '.'),
    };
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      studentId,
      attendanceDate: {
        gte: firstSunday,
        lte: lastSunday,
      },
    },
    select: {
      attendanceDate: true,
      status: true,
    },
  });

  const statusByDate = new Map(
    attendanceRows.map((attendance) => [formatDateToKoreanYmd(attendance.attendanceDate), attendance.status])
  );

  const statuses = Object.fromEntries(
    weeks.map((week) => [week.date, statusByDate.get(week.date) ?? AttendanceStatus.ABSENT])
  );

  return NextResponse.json({
    studentName: student.name,
    schoolYearStart,
    schoolYearEnd,
    weeks,
    statuses,
  });
}
