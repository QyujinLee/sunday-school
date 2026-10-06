import { AttendanceStatus, type Gender, Prisma, TalentTransactionReason } from '@prisma/client';

import { type AttendanceTabKey, filterStudentsByAttendanceTab, getAttendancePeriodInfo } from '@/lib/attendance';
import { prisma } from '@/lib/prisma';
import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';
import { type WeeklyCalendarSummary, getWeeklyCalendarSummary } from '@/server/calendar/google-calendar';
import {
  addWeeks,
  formatDateToKoreanYmd,
  getKoreanDateParts,
  getKoreanWeekdayIndex,
  getLastSundayOfMonthKst,
} from '@/utils/date';
import { type StudentGradeLabel, getGradeLabelByBirthDateInKst } from '@/utils/grade';

const SERIALIZABLE_RETRY_MAX_COUNT = 2;
const SERIALIZABLE_RETRY_DELAY_MS = 80;
const WEEKLY_TREND_WEEK_COUNT = 13;

export const TALENT_ADJUST_VALUES = new Set(['3', '2', '1', '-1']);

export type StudentRow = {
  id: string;
  name: string;
  gender: Gender;
  birthDate: Date;
  currentTalent: number;
  weeklyExtraTalent: number;
  gradeLabel: StudentGradeLabel;
  attendanceStatus: AttendanceStatus;
};

export type TalentLogRow = {
  id: string;
  amount: number;
  transactedAt: Date;
  student: {
    name: string;
  };
  teacher: {
    name: string | null;
    email: string;
  } | null;
};

type DashboardData = {
  currentQuarter: 1 | 2 | 3 | 4;
  shouldShowBirthdayPartyBanner: boolean;
  quarterlyBirthdayStudents: Array<{ id: string; name: string; gradeLabel: StudentGradeLabel }>;
  thisMonthTeacherBirthdays: Array<{ id: string; displayName: string }>;
  nextMonthTeacherBirthdays: Array<{ id: string; displayName: string }>;
  todayPresentCount: number;
  weeklyTrend: Array<{ label: string; count: number }>;
  currentWeekCalendarSummary: WeeklyCalendarSummary | null;
  nextWeekCalendarSummary: WeeklyCalendarSummary | null;
};

/**
 * 대시보드(분기 생일·교사 생일·출석 추이·주간 일정) 데이터를 조회한다.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const { attendanceDate } = getAttendancePeriodInfo(now);
  const { year: attendanceYear, month: thisMonth } = getKoreanDateParts(attendanceDate);
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;
  const currentQuarter = getCurrentQuarterByLastSunday(attendanceDate);
  const quarterEndMonth = currentQuarter * 3;
  const quarterStartMonth = quarterEndMonth - 2;
  const quarterEndSunday = getLastSundayOfMonthKst(attendanceYear, quarterEndMonth);
  const weeklyTrendDates = Array.from({ length: WEEKLY_TREND_WEEK_COUNT }, (_, index) =>
    addWeeks(attendanceDate, index - (WEEKLY_TREND_WEEK_COUNT - 1))
  );
  // 예배 일정은 일요일 당일이면 그날, 월~토면 다가오는 일요일 기준으로 보여준다.
  const worshipWeekSundayDate = getKoreanWeekdayIndex(now) === 0 ? attendanceDate : addWeeks(attendanceDate, 1);

  const [students, teachers, weeklyPresentGroup, currentWeekCalendarSummary, nextWeekCalendarSummary] =
    await Promise.all([
      prisma.student.findMany({
        select: { id: true, name: true, birthDate: true },
      }),
      prisma.teacher.findMany({
        where: { approvalStatus: 'APPROVED', birthDate: { not: null } },
        select: { id: true, name: true, email: true, birthDate: true },
        orderBy: { name: 'asc' },
      }),
      prisma.attendance.groupBy({
        by: ['attendanceDate'],
        where: {
          attendanceDate: { gte: weeklyTrendDates[0], lte: attendanceDate },
          status: AttendanceStatus.PRESENT,
        },
        _count: { _all: true },
      }),
      getWeeklyCalendarSummary(worshipWeekSundayDate, addWeeks(worshipWeekSundayDate, 1)),
      getWeeklyCalendarSummary(addWeeks(worshipWeekSundayDate, 1), addWeeks(worshipWeekSundayDate, 2)),
    ]);

  const quarterlyBirthdayStudents = sortStudentsByGradeDescThenName(
    students
      .filter((student) => {
        const birthMonth = getKoreanDateParts(student.birthDate).month;
        return birthMonth >= quarterStartMonth && birthMonth <= quarterEndMonth;
      })
      .map((student) => ({ ...student, gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate) }))
  ).map(({ id, name, gradeLabel }) => ({ id, name, gradeLabel }));

  /**
   * 해당 월에 생일인 교사를 화면 표시용으로 변환한다.
   */
  const getTeacherBirthdaysInMonth = (month: number) =>
    teachers
      .filter((teacher) => teacher.birthDate && getKoreanDateParts(teacher.birthDate).month === month)
      .map((teacher) => ({ id: teacher.id, displayName: teacher.name ?? teacher.email }));

  const weeklyPresentCountByDate = new Map(
    weeklyPresentGroup.map((row) => [formatDateToKoreanYmd(row.attendanceDate), row._count._all])
  );
  const weeklyTrend = weeklyTrendDates.map((sunday) => {
    const ymd = formatDateToKoreanYmd(sunday);
    return { label: ymd.slice(5), count: weeklyPresentCountByDate.get(ymd) ?? 0 };
  });

  return {
    currentQuarter,
    shouldShowBirthdayPartyBanner: quarterEndSunday.getTime() === attendanceDate.getTime(),
    quarterlyBirthdayStudents,
    thisMonthTeacherBirthdays: getTeacherBirthdaysInMonth(thisMonth),
    nextMonthTeacherBirthdays: getTeacherBirthdaysInMonth(nextMonth),
    // 추이의 마지막 항목이 이번 주 일요일이다.
    todayPresentCount: weeklyTrend[weeklyTrend.length - 1].count,
    weeklyTrend,
    currentWeekCalendarSummary,
    nextWeekCalendarSummary,
  };
}

/**
 * 출석 관리 화면의 학생 목록(탭 필터 적용)과 이번 주 달란트 수동 조정 기록을 조회한다.
 */
export async function getAttendanceInteractiveData(selectedTab: AttendanceTabKey): Promise<{
  studentsForTable: StudentRow[];
  talentLogs: TalentLogRow[];
}> {
  const { attendanceDate, nextSundayDate } = getAttendancePeriodInfo();
  const weeklyManualAdjustWhere = {
    reason: TalentTransactionReason.MANUAL_ADJUST,
    transactedAt: { gte: attendanceDate, lt: nextSundayDate },
  };

  const [students, attendanceRows, weeklyManualTalentSums, talentLogs] = await Promise.all([
    prisma.student.findMany({
      select: { id: true, name: true, gender: true, birthDate: true, currentTalent: true },
    }),
    prisma.attendance.findMany({
      where: { attendanceDate },
      select: { studentId: true, status: true },
    }),
    prisma.talentTransaction.groupBy({
      by: ['studentId'],
      where: weeklyManualAdjustWhere,
      _sum: { amount: true },
    }),
    prisma.talentTransaction.findMany({
      where: weeklyManualAdjustWhere,
      orderBy: { transactedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        amount: true,
        transactedAt: true,
        student: { select: { name: true } },
        teacher: { select: { name: true, email: true } },
      },
    }),
  ]);

  const attendanceStatusByStudentId = new Map(attendanceRows.map((row) => [row.studentId, row.status]));
  const weeklyManualTalentByStudentId = new Map(
    weeklyManualTalentSums.map((row) => [row.studentId, row._sum.amount ?? 0])
  );
  const studentRows: StudentRow[] = sortStudentsByGradeDescThenName(
    students.map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate),
      attendanceStatus: attendanceStatusByStudentId.get(student.id) ?? AttendanceStatus.ABSENT,
      weeklyExtraTalent: weeklyManualTalentByStudentId.get(student.id) ?? 0,
    }))
  );

  return {
    studentsForTable: filterStudentsByAttendanceTab(studentRows, selectedTab),
    talentLogs,
  };
}

/**
 * 달란트를 수동 조정하고 변동 기록을 남긴 뒤, 이번 주 수동 조정 합계를 함께 반환한다.
 */
export async function updateStudentTalent(
  studentId: string,
  amount: number,
  teacherId: string,
  attendanceDate: Date,
  nextSundayDate: Date
): Promise<{
  studentId: string;
  studentName: string;
  currentTalent: number;
  weeklyExtraTalent: number;
  transaction: {
    id: string;
    amount: number;
    transactedAt: Date;
  };
}> {
  return runSerializableTransactionWithRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: { currentTalent: { increment: amount } },
          select: { id: true, name: true, currentTalent: true },
        });

        const createdTransaction = await tx.talentTransaction.create({
          data: {
            studentId,
            teacherId,
            reason: TalentTransactionReason.MANUAL_ADJUST,
            amount,
          },
          select: { id: true, amount: true, transactedAt: true },
        });

        const weeklyExtraTalentSummary = await tx.talentTransaction.aggregate({
          where: {
            studentId,
            reason: TalentTransactionReason.MANUAL_ADJUST,
            transactedAt: { gte: attendanceDate, lt: nextSundayDate },
          },
          _sum: { amount: true },
        });

        return {
          studentId: updatedStudent.id,
          studentName: updatedStudent.name,
          currentTalent: updatedStudent.currentTalent,
          weeklyExtraTalent: weeklyExtraTalentSummary._sum.amount ?? 0,
          transaction: createdTransaction,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  );
}

/**
 * 클라이언트가 본 상태(expectedCurrentStatus)와 DB 상태가 같을 때만 출석을 변경하고 달란트를 ±1 연동한다.
 * 다른 교사가 먼저 변경해 상태가 다르면 stale_state를 반환한다.
 */
export async function updateAttendanceWithExpectedStatus(
  studentId: string,
  attendanceDate: Date,
  expectedCurrentStatus: AttendanceStatus,
  nextStatus: AttendanceStatus,
  teacherId: string
): Promise<
  | {
      result: 'updated';
      nextStatus: AttendanceStatus;
      currentTalent: number;
      talentDelta: number;
    }
  | {
      result: 'stale_state';
    }
> {
  return runSerializableTransactionWithRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const existingAttendance = await tx.attendance.findUnique({
          where: { studentId_attendanceDate: { studentId, attendanceDate } },
        });

        const currentStatus = existingAttendance?.status ?? AttendanceStatus.ABSENT;
        if (currentStatus !== expectedCurrentStatus || currentStatus === nextStatus) {
          return { result: 'stale_state' as const };
        }

        await tx.attendance.upsert({
          where: { studentId_attendanceDate: { studentId, attendanceDate } },
          create: { studentId, attendanceDate, status: nextStatus },
          update: { status: nextStatus },
        });

        // 위에서 currentStatus !== nextStatus를 확인했으므로 PRESENT/ABSENT 전환만 남는다.
        const talentDelta = nextStatus === AttendanceStatus.PRESENT ? 1 : -1;

        const updatedStudent = await tx.student.update({
          where: { id: studentId },
          data: { currentTalent: { increment: talentDelta } },
          select: { currentTalent: true },
        });

        await tx.talentTransaction.create({
          data: {
            studentId,
            teacherId,
            reason: TalentTransactionReason.ATTENDANCE,
            amount: talentDelta,
          },
        });

        return {
          result: 'updated' as const,
          nextStatus,
          currentTalent: updatedStudent.currentTalent,
          talentDelta,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  );
}

/**
 * Serializable 트랜잭션 충돌(P2034) 시 짧게 대기한 뒤 재시도한다.
 */
async function runSerializableTransactionWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let retryCount = 0; ; retryCount += 1) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

      if (!isRetryable || retryCount >= SERIALIZABLE_RETRY_MAX_COUNT) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, SERIALIZABLE_RETRY_DELAY_MS * (retryCount + 1)));
    }
  }
}

/**
 * 분기 말월의 마지막 일요일을 분기 경계로 보고 현재 분기를 계산한다.
 */
function getCurrentQuarterByLastSunday(sundayDate: Date): 1 | 2 | 3 | 4 {
  const { year } = getKoreanDateParts(sundayDate);

  for (const quarter of [1, 2, 3] as const) {
    if (sundayDate <= getLastSundayOfMonthKst(year, quarter * 3)) {
      return quarter;
    }
  }

  return 4;
}
