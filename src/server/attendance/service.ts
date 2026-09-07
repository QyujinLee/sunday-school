import { AttendanceStatus, Gender, Prisma, TalentTransactionReason } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';
import { getWeeklyCalendarSummary } from '@/server/calendar/google-calendar';
import { formatDateToKoreanYmd, getKoreanYear } from '@/utils/date';
import { getGradeLabelByBirthDateInKst, type StudentGradeLabel } from '@/utils/grade';

const ATTENDANCE_TAB_KEYS = [
  'this_week',
  'all',
  'grade_6',
  'grade_5',
  'grade_4',
  'grade_3',
  'grade_2',
  'grade_1',
  'kindergarten',
] as const;

const KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const SERIALIZABLE_RETRY_MAX_COUNT = 2;
const SERIALIZABLE_RETRY_DELAY_MS = 80;

export const TALENT_ADJUST_VALUES = new Set(['3', '2', '1', '-1']);

export type AttendanceTabKey = (typeof ATTENDANCE_TAB_KEYS)[number];

// Grade labels are defined only in src/utils/grade.ts (see CLAUDE.md).
type GradeLabel = StudentGradeLabel;

export const ATTENDANCE_TABS: ReadonlyArray<{ key: AttendanceTabKey; label: string }> = [
  { key: 'this_week', label: '\uAE08\uC8FC \uCD9C\uC11D' },
  { key: 'all', label: '\uC804\uCCB4' },
  { key: 'grade_6', label: '6\uD559\uB144' },
  { key: 'grade_5', label: '5\uD559\uB144' },
  { key: 'grade_4', label: '4\uD559\uB144' },
  { key: 'grade_3', label: '3\uD559\uB144' },
  { key: 'grade_2', label: '2\uD559\uB144' },
  { key: 'grade_1', label: '1\uD559\uB144' },
  { key: 'kindergarten', label: '\uC720\uC544\uBD80' },
];

export type StudentRow = {
  id: string;
  name: string;
  gender: Gender;
  birthDate: Date;
  currentTalent: number;
  weeklyExtraTalent: number;
  gradeLabel: GradeLabel;
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

type BirthdayStudentRow = {
  id: string;
  name: string;
  birthDate: Date;
  gradeLabel: GradeLabel;
};

type AttendancePageData = {
  attendanceDate: Date;
  nextSundayDate: Date;
  currentQuarter: 1 | 2 | 3 | 4;
  shouldShowBirthdayPartyBanner: boolean;
  quarterlyBirthdayStudents: Array<{
    id: string;
    name: string;
    gradeLabel: GradeLabel;
  }>;
  thisMonthTeacherBirthdays: Array<{
    id: string;
    displayName: string;
  }>;
  nextMonthTeacherBirthdays: Array<{
    id: string;
    displayName: string;
  }>;
  todayPresentCount: number;
  weeklyTrend: Array<{
    label: string;
    count: number;
  }>;
  currentWeekCalendarSummary: {
    title: string;
    worshipDate: string | null;
    socialLeader: string | null;
    pulpitLeader: string | null;
    weeklySchedules: string[];
  } | null;
  nextWeekCalendarSummary: {
    title: string;
    worshipDate: string | null;
    socialLeader: string | null;
    pulpitLeader: string | null;
    weeklySchedules: string[];
  } | null;
  studentsForTable: StudentRow[];
  talentLogs: TalentLogRow[];
};

export function getSelectedAttendanceTab(tabValue: string | string[] | undefined): AttendanceTabKey {
  const resolvedValue = Array.isArray(tabValue) ? tabValue[0] : tabValue;

  if (resolvedValue && ATTENDANCE_TAB_KEYS.includes(resolvedValue as AttendanceTabKey)) {
    return resolvedValue as AttendanceTabKey;
  }

  return 'this_week';
}

export function getGenderLabel(gender: Gender): string {
  return gender === Gender.MALE ? '\uB0A8' : '\uC5EC';
}

export function getGradeDisplayLabel(student: Pick<StudentRow, 'gradeLabel' | 'birthDate'>): string {
  if (student.gradeLabel !== '\uC720\uC544\uBD80') {
    return student.gradeLabel;
  }

  const currentYearInKst = getKoreanYear(new Date());
  const yearlyAge = Math.max(0, currentYearInKst - getKoreanYear(student.birthDate));
  return `\uC720\uC544\uBD80 (\uC5F0 ${yearlyAge}\uC138)`;
}

export async function getAttendancePageData(selectedTab: AttendanceTabKey): Promise<AttendancePageData> {
  const attendanceDate = getCurrentSundayKstDate();
  const nextSundayDate = getNextSundayKstDate(attendanceDate);
  const todayKstDate = new Date(`${formatDateToKoreanYmd(new Date())}T00:00:00+09:00`);
  const todayKstYmd = formatDateToKoreanYmd(todayKstDate);
  const currentQuarter = getCurrentQuarterByLastSunday(attendanceDate);
  const [quarterStartMonth, quarterEndMonth] = getQuarterMonthRange(currentQuarter);
  const currentQuarterEndMonth = getQuarterEndMonth(currentQuarter);
  const quarterEndSunday = getLastSundayOfMonthKst(Number(todayKstYmd.slice(0, 4)), currentQuarterEndMonth);
  const shouldShowBirthdayPartyBanner = quarterEndSunday >= attendanceDate && quarterEndSunday < nextSundayDate;
  const thisMonth = Number(formatDateToKoreanYmd(attendanceDate).slice(5, 7));
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;

  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      currentTalent: true,
    },
  });

  const quarterlyBirthdayStudents = sortBirthdayStudents(
    students
      .map((student) => ({
        id: student.id,
        name: student.name,
        birthDate: student.birthDate,
        gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate),
      }))
      .filter((student) => {
        const birthMonth = Number(formatDateToKoreanYmd(student.birthDate).slice(5, 7));
        return birthMonth >= quarterStartMonth && birthMonth <= quarterEndMonth;
      }),
  );

  const teacherBirthdays = await prisma.teacher.findMany({
    where: {
      approvalStatus: 'APPROVED',
      birthDate: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      birthDate: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const thisMonthTeacherBirthdays = teacherBirthdays.filter((teacher) => {
    if (!teacher.birthDate) {
      return false;
    }

    const birthMonth = Number(formatDateToKoreanYmd(teacher.birthDate).slice(5, 7));
    return birthMonth === thisMonth;
  });

  const nextMonthTeacherBirthdays = teacherBirthdays.filter((teacher) => {
    if (!teacher.birthDate) {
      return false;
    }

    const birthMonth = Number(formatDateToKoreanYmd(teacher.birthDate).slice(5, 7));
    return birthMonth === nextMonth;
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      attendanceDate,
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  const attendanceStatusByStudentId = new Map(attendanceRows.map((row) => [row.studentId, row.status]));
  const todayPresentCount = attendanceRows.filter((row) => row.status === AttendanceStatus.PRESENT).length;

  const weeklyTrendDates = getWeeklySundaySeriesForLastThreeMonths(attendanceDate);
  const trendStartSunday = weeklyTrendDates[0];
  const weeklyPresentGroup = await prisma.attendance.groupBy({
    by: ['attendanceDate'],
    where: {
      attendanceDate: {
        gte: trendStartSunday,
        lte: attendanceDate,
      },
      status: AttendanceStatus.PRESENT,
    },
    _count: {
      _all: true,
    },
  });

  const weeklyPresentCountByDate = new Map(
    weeklyPresentGroup.map((row) => [formatDateToKoreanYmd(row.attendanceDate), row._count._all]),
  );
  const weeklyTrend = weeklyTrendDates.map((targetSunday) => {
    const dateKey = formatDateToKoreanYmd(targetSunday);
    return {
      label: formatDateToMmDd(targetSunday),
      count: weeklyPresentCountByDate.get(dateKey) ?? 0,
    };
  });

  const worshipWeekSundayDate = getWorshipWeekSundayKstDate();
  const nextWorshipWeekSundayDate = getNextSundayKstDate(worshipWeekSundayDate);
  const thirdWorshipWeekSundayDate = getNextSundayKstDate(nextWorshipWeekSundayDate);
  const currentWeekCalendarSummary = await getWeeklyCalendarSummary(worshipWeekSundayDate, nextWorshipWeekSundayDate);
  const nextWeekCalendarSummary = await getWeeklyCalendarSummary(nextWorshipWeekSundayDate, thirdWorshipWeekSundayDate);

  const weeklyManualTalentSums = await prisma.talentTransaction.groupBy({
    by: ['studentId'],
    where: {
      reason: TalentTransactionReason.MANUAL_ADJUST,
      transactedAt: {
        gte: attendanceDate,
        lt: nextSundayDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const weeklyManualTalentByStudentId = new Map(
    weeklyManualTalentSums.map((row) => [row.studentId, row._sum.amount ?? 0]),
  );

  const studentRows: StudentRow[] = students
    .map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate),
      attendanceStatus: attendanceStatusByStudentId.get(student.id) ?? AttendanceStatus.ABSENT,
      weeklyExtraTalent: weeklyManualTalentByStudentId.get(student.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  const sortedStudentRows = sortStudentsByGradeDescThenName(studentRows);
  const filteredStudents = filterStudentsByTab(sortedStudentRows, selectedTab);
  const studentsForTable =
    selectedTab === 'this_week'
      ? filteredStudents.filter((student) => student.attendanceStatus === AttendanceStatus.PRESENT)
      : filteredStudents;

  const talentLogs: TalentLogRow[] = await prisma.talentTransaction.findMany({
    where: {
      reason: TalentTransactionReason.MANUAL_ADJUST,
      transactedAt: {
        gte: attendanceDate,
        lt: nextSundayDate,
      },
    },
    orderBy: { transactedAt: 'desc' },
    take: 40,
    select: {
      id: true,
      amount: true,
      transactedAt: true,
      student: {
        select: {
          name: true,
        },
      },
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    attendanceDate,
    nextSundayDate,
    currentQuarter,
    shouldShowBirthdayPartyBanner,
    quarterlyBirthdayStudents: quarterlyBirthdayStudents.map((student) => ({
      id: student.id,
      name: student.name,
      gradeLabel: student.gradeLabel,
    })),
    thisMonthTeacherBirthdays: thisMonthTeacherBirthdays.map((teacher) => ({
      id: teacher.id,
      displayName: teacher.name ?? teacher.email,
    })),
    nextMonthTeacherBirthdays: nextMonthTeacherBirthdays.map((teacher) => ({
      id: teacher.id,
      displayName: teacher.name ?? teacher.email,
    })),
    todayPresentCount,
    weeklyTrend,
    currentWeekCalendarSummary,
    nextWeekCalendarSummary,
    studentsForTable,
    talentLogs,
  };
}

export async function getAttendanceInteractiveData(selectedTab: AttendanceTabKey): Promise<{
  studentsForTable: StudentRow[];
  talentLogs: TalentLogRow[];
}> {
  const attendanceDate = getCurrentSundayKstDate();
  const nextSundayDate = getNextSundayKstDate(attendanceDate);

  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      currentTalent: true,
    },
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      attendanceDate,
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  const attendanceStatusByStudentId = new Map(attendanceRows.map((row) => [row.studentId, row.status]));

  const weeklyManualTalentSums = await prisma.talentTransaction.groupBy({
    by: ['studentId'],
    where: {
      reason: TalentTransactionReason.MANUAL_ADJUST,
      transactedAt: {
        gte: attendanceDate,
        lt: nextSundayDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const weeklyManualTalentByStudentId = new Map(
    weeklyManualTalentSums.map((row) => [row.studentId, row._sum.amount ?? 0]),
  );

  const studentRows: StudentRow[] = students
    .map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate),
      attendanceStatus: attendanceStatusByStudentId.get(student.id) ?? AttendanceStatus.ABSENT,
      weeklyExtraTalent: weeklyManualTalentByStudentId.get(student.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  const sortedStudentRows = sortStudentsByGradeDescThenName(studentRows);
  const filteredStudents = filterStudentsByTab(sortedStudentRows, selectedTab);
  const studentsForTable =
    selectedTab === 'this_week'
      ? filteredStudents.filter((student) => student.attendanceStatus === AttendanceStatus.PRESENT)
      : filteredStudents;

  const talentLogs: TalentLogRow[] = await prisma.talentTransaction.findMany({
    where: {
      reason: TalentTransactionReason.MANUAL_ADJUST,
      transactedAt: {
        gte: attendanceDate,
        lt: nextSundayDate,
      },
    },
    orderBy: { transactedAt: 'desc' },
    take: 40,
    select: {
      id: true,
      amount: true,
      transactedAt: true,
      student: {
        select: {
          name: true,
        },
      },
      teacher: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    studentsForTable,
    talentLogs,
  };
}

export function getAttendancePeriodInfo(baseDate: Date = new Date()): {
  attendanceDate: Date;
  nextSundayDate: Date;
} {
  const attendanceDate = getCurrentSundayKstDate(baseDate);
  const nextSundayDate = getNextSundayKstDate(attendanceDate);

  return {
    attendanceDate,
    nextSundayDate,
  };
}

export async function updateStudentTalent(
  studentId: string,
  amount: number,
  teacherId: string,
  attendanceDate: Date,
  nextSundayDate: Date,
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
          data: {
            currentTalent: {
              increment: amount,
            },
          },
          select: {
            id: true,
            name: true,
            currentTalent: true,
          },
        });

        const createdTransaction = await tx.talentTransaction.create({
          data: {
            studentId,
            teacherId,
            reason: TalentTransactionReason.MANUAL_ADJUST,
            amount,
          },
          select: {
            id: true,
            amount: true,
            transactedAt: true,
          },
        });

        const weeklyExtraTalentSummary = await tx.talentTransaction.aggregate({
          where: {
            studentId,
            reason: TalentTransactionReason.MANUAL_ADJUST,
            transactedAt: {
              gte: attendanceDate,
              lt: nextSundayDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        return {
          studentId: updatedStudent.id,
          studentName: updatedStudent.name,
          currentTalent: updatedStudent.currentTalent,
          weeklyExtraTalent: weeklyExtraTalentSummary._sum.amount ?? 0,
          transaction: createdTransaction,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
}

export async function updateAttendanceWithExpectedStatus(
  studentId: string,
  attendanceDate: Date,
  expectedCurrentStatus: AttendanceStatus,
  nextStatus: AttendanceStatus,
  teacherId: string,
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
          where: {
            studentId_attendanceDate: {
              studentId,
              attendanceDate,
            },
          },
        });

        const currentStatus = existingAttendance?.status ?? AttendanceStatus.ABSENT;
        if (currentStatus !== expectedCurrentStatus || currentStatus === nextStatus) {
          return { result: 'stale_state' as const };
        }

        let talentDelta = 0;

        if (!existingAttendance) {
          await tx.attendance.create({
            data: {
              studentId,
              attendanceDate,
              status: nextStatus,
            },
          });
        } else {
          await tx.attendance.update({
            where: {
              studentId_attendanceDate: {
                studentId,
                attendanceDate,
              },
            },
            data: {
              status: nextStatus,
            },
          });
        }

        if (currentStatus === AttendanceStatus.ABSENT && nextStatus === AttendanceStatus.PRESENT) {
          talentDelta = 1;
        } else if (currentStatus === AttendanceStatus.PRESENT && nextStatus === AttendanceStatus.ABSENT) {
          talentDelta = -1;
        }

        let currentTalent = 0;

        if (talentDelta !== 0) {
          const updatedStudent = await tx.student.update({
            where: { id: studentId },
            data: {
              currentTalent: {
                increment: talentDelta,
              },
            },
            select: {
              currentTalent: true,
            },
          });
          currentTalent = updatedStudent.currentTalent;

          await tx.talentTransaction.create({
            data: {
              studentId,
              teacherId,
              reason: TalentTransactionReason.ATTENDANCE,
              amount: talentDelta,
            },
          });
        } else {
          const currentStudent = await tx.student.findUnique({
            where: { id: studentId },
            select: {
              currentTalent: true,
            },
          });
          currentTalent = currentStudent?.currentTalent ?? 0;
        }

        return {
          result: 'updated' as const,
          nextStatus,
          currentTalent,
          talentDelta,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
}

function isRetryableSerializableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function runSerializableTransactionWithRetry<T>(
  operation: () => Promise<T>,
  retryMaxCount: number = SERIALIZABLE_RETRY_MAX_COUNT,
): Promise<T> {
  let retryCount = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableSerializableError(error) || retryCount >= retryMaxCount) {
        throw error;
      }

      retryCount += 1;
      await delay(SERIALIZABLE_RETRY_DELAY_MS * retryCount);
    }
  }
}

function getKoreanWeekdayIndex(date: Date): number {
  const shortWeekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date);

  return KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME[shortWeekdayName] ?? 0;
}

function getCurrentSundayKstDate(baseDate: Date = new Date()): Date {
  const todayKoreanYmd = formatDateToKoreanYmd(baseDate);
  const todayKstMidnight = new Date(`${todayKoreanYmd}T00:00:00+09:00`);
  const weekdayIndex = getKoreanWeekdayIndex(baseDate);
  const currentSunday = new Date(todayKstMidnight);
  currentSunday.setUTCDate(currentSunday.getUTCDate() - weekdayIndex);
  return currentSunday;
}

function getNextSundayKstDate(currentSundayKstDate: Date): Date {
  const nextSunday = new Date(currentSundayKstDate);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  return nextSunday;
}

/**
 * 예배 일정 기준 일요일을 반환한다.
 * 일요일은 당일을, 월~토는 다음 일요일을 기준으로 사용한다.
 */
function getWorshipWeekSundayKstDate(baseDate: Date = new Date()): Date {
  const currentSunday = getCurrentSundayKstDate(baseDate);
  const weekdayIndex = getKoreanWeekdayIndex(baseDate);

  if (weekdayIndex === 0) {
    return currentSunday;
  }

  return getNextSundayKstDate(currentSunday);
}

function formatDateToMmDd(dateValue: Date): string {
  const ymd = formatDateToKoreanYmd(dateValue);
  return ymd.slice(5);
}

function getPreviousSundayByWeeks(currentSundayKstDate: Date, weeksAgo: number): Date {
  const targetSunday = new Date(currentSundayKstDate);
  targetSunday.setUTCDate(targetSunday.getUTCDate() - weeksAgo * 7);
  return targetSunday;
}

function getWeeklySundaySeriesForLastThreeMonths(currentSundayKstDate: Date): Date[] {
  const series: Date[] = [];
  for (let weeksAgo = 12; weeksAgo >= 0; weeksAgo -= 1) {
    series.push(getPreviousSundayByWeeks(currentSundayKstDate, weeksAgo));
  }
  return series;
}

function getLastSundayOfMonthKst(year: number, month: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(lastDayOfMonth);
  const weekdayIndex = KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME[weekdayName] ?? 0;

  const lastSunday = new Date(lastDayOfMonth);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - weekdayIndex);
  return lastSunday;
}

function getCurrentQuarterByLastSunday(today: Date): 1 | 2 | 3 | 4 {
  const currentYear = Number(formatDateToKoreanYmd(today).slice(0, 4));
  const quarterEndMonths = [3, 6, 9, 12] as const;

  for (let index = 0; index < quarterEndMonths.length; index += 1) {
    const quarterEnd = getLastSundayOfMonthKst(currentYear, quarterEndMonths[index]);
    if (today <= quarterEnd) {
      return (index + 1) as 1 | 2 | 3 | 4;
    }
  }

  return 4;
}

function getQuarterMonthRange(quarter: 1 | 2 | 3 | 4): [number, number] {
  if (quarter === 1) {
    return [1, 3];
  }
  if (quarter === 2) {
    return [4, 6];
  }
  if (quarter === 3) {
    return [7, 9];
  }
  return [10, 12];
}

function getQuarterEndMonth(quarter: 1 | 2 | 3 | 4): 3 | 6 | 9 | 12 {
  if (quarter === 1) {
    return 3;
  }
  if (quarter === 2) {
    return 6;
  }
  if (quarter === 3) {
    return 9;
  }
  return 12;
}

function sortBirthdayStudents(students: BirthdayStudentRow[]): BirthdayStudentRow[] {
  return sortStudentsByGradeDescThenName(students);
}

function filterStudentsByTab(students: StudentRow[], selectedTab: AttendanceTabKey): StudentRow[] {
  if (selectedTab === 'all' || selectedTab === 'this_week') {
    return students;
  }

  const gradeLabelByTab: Record<Exclude<AttendanceTabKey, 'all' | 'this_week'>, GradeLabel> = {
    grade_6: '6\uD559\uB144',
    grade_5: '5\uD559\uB144',
    grade_4: '4\uD559\uB144',
    grade_3: '3\uD559\uB144',
    grade_2: '2\uD559\uB144',
    grade_1: '1\uD559\uB144',
    kindergarten: '\uC720\uC544\uBD80',
  };

  return students.filter((student) => student.gradeLabel === gradeLabelByTab[selectedTab]);
}
