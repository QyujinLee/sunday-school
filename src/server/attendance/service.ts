import { AttendanceStatus, Gender, Prisma, TalentTransactionReason } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';
import { getWeeklyCalendarSummary } from '@/server/calendar/google-calendar';
import { formatDateToKoreanYmd } from '@/utils/date';

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
export const ATTENDANCE_TABS: ReadonlyArray<{ key: AttendanceTabKey; label: string }> = [
  { key: 'this_week', label: '금주 출석' },
  { key: 'all', label: '전체' },
  { key: 'grade_6', label: '6학년' },
  { key: 'grade_5', label: '5학년' },
  { key: 'grade_4', label: '4학년' },
  { key: 'grade_3', label: '3학년' },
  { key: 'grade_2', label: '2학년' },
  { key: 'grade_1', label: '1학년' },
  { key: 'kindergarten', label: '유아부' },
];

export type AttendanceTabKey = (typeof ATTENDANCE_TAB_KEYS)[number];

export type StudentRow = {
  id: string;
  name: string;
  gender: Gender;
  birthDate: Date;
  currentTalent: number;
  weeklyExtraTalent: number;
  gradeLabel: '6학년' | '5학년' | '4학년' | '3학년' | '2학년' | '1학년' | '유아부';
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
  gradeLabel: StudentRow['gradeLabel'];
};

type AttendancePageData = {
  attendanceDate: Date;
  nextSundayDate: Date;
  currentQuarter: 1 | 2 | 3 | 4;
  shouldShowBirthdayPartyBanner: boolean;
  quarterlyBirthdayStudents: Array<{
    id: string;
    name: string;
    gradeLabel: StudentRow['gradeLabel'];
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

/**
 * 쿼리스트링에서 현재 선택된 출석 탭을 파싱한다.
 */
export function getSelectedAttendanceTab(tabValue: string | string[] | undefined): AttendanceTabKey {
  const resolvedValue = Array.isArray(tabValue) ? tabValue[0] : tabValue;

  if (resolvedValue && ATTENDANCE_TAB_KEYS.includes(resolvedValue as AttendanceTabKey)) {
    return resolvedValue as AttendanceTabKey;
  }

  return 'this_week';
}

/**
 * 성별 enum 값을 화면 표시용 문자열로 변환한다.
 */
export function getGenderLabel(gender: Gender): string {
  return gender === Gender.MALE ? '남' : '여';
}

/**
 * 학년 표시 문자열을 반환한다. 유아부는 연 나이를 함께 표시한다.
 */
export function getGradeDisplayLabel(student: Pick<StudentRow, 'gradeLabel' | 'birthDate'>): string {
  if (student.gradeLabel !== '유아부') {
    return student.gradeLabel;
  }

  const currentYear = new Date().getFullYear();
  const yearlyAge = Math.max(0, currentYear - student.birthDate.getFullYear());

  return `유아부 (??${yearlyAge}??`;
}

/**
 * 출석 관리 페이지에 필요한 데이터를 조회한다.
 */
export async function getAttendancePageData(selectedTab: AttendanceTabKey): Promise<AttendancePageData> {
  const attendanceDate = getCurrentSundayKstDate();
  const nextSundayDate = getNextSundayKstDate(attendanceDate);
  const todayKstDate = new Date(`${formatDateToKoreanYmd(new Date())}T00:00:00+09:00`);
  const todayKstYmd = formatDateToKoreanYmd(todayKstDate);
  const currentQuarter = getCurrentQuarterByLastSunday(attendanceDate);
  const [quarterStartMonth, quarterEndMonth] = getQuarterMonthRange(currentQuarter);
  const currentQuarterEndMonth = getQuarterEndMonth(currentQuarter);
  const quarterEndSunday = getLastSundayOfMonthKst(Number(todayKstYmd.slice(0, 4)), currentQuarterEndMonth);
  const isQuarterBirthdayPartyWeek = quarterEndSunday >= attendanceDate && quarterEndSunday < nextSundayDate;
  const shouldShowBirthdayPartyBanner = isQuarterBirthdayPartyWeek;
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
        gradeLabel: getGradeLabelByBirthDate(student.birthDate),
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
  const nextNextSundayDate = getNextSundayKstDate(nextSundayDate);
  const thirdSundayDate = getNextSundayKstDate(nextNextSundayDate);
  const currentWeekCalendarSummary = await getWeeklyCalendarSummary(attendanceDate, nextSundayDate);
  const nextWeekCalendarSummary = await getWeeklyCalendarSummary(nextNextSundayDate, thirdSundayDate);

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
      gradeLabel: getGradeLabelByBirthDate(student.birthDate),
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

/**
 * 수동 달란트 증감 트랜잭션을 처리한다.
 */
/**
 * 출석 인터랙션(출석 버튼/달란트 조정/로그)에 필요한 데이터만 조회한다.
 */
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
      gradeLabel: getGradeLabelByBirthDate(student.birthDate),
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

type AttendanceLedgerWeek = {
  date: string;
  label: string;
};

type AttendanceLedgerStudentRow = {
  id: string;
  name: string;
  gradeLabel: StudentRow['gradeLabel'];
  attendanceByDate: Record<string, AttendanceStatus>;
};

type AttendanceLedgerPageData = {
  schoolYearStart: number;
  schoolYearEnd: number;
  weeks: AttendanceLedgerWeek[];
  students: AttendanceLedgerStudentRow[];
};

/**
 * 출석 관리에서 사용하는 기준 주차(금주 일요일, 차주 일요일)를 반환한다.
 */
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

/**
 * 출석부 페이지에 필요한 올해 주차/학생별 출석 상태 데이터를 조회한다.
 */
export async function getAttendanceLedgerPageData(baseDate: Date = new Date()): Promise<AttendanceLedgerPageData> {
  const attendanceDate = getCurrentSundayKstDate(baseDate);
  const attendanceYmd = formatDateToKoreanYmd(attendanceDate);
  const currentYear = Number(attendanceYmd.slice(0, 4));
  const currentMonth = Number(attendanceYmd.slice(5, 7));
  const schoolYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const schoolYearEnd = schoolYearStart + 1;
  const firstSunday = getFirstSundayOfMonthKst(schoolYearStart, 3);
  const lastSunday = getLastSundayOfMonthKst(schoolYearEnd, 2);
  const weeks = getSundaySeriesBetween(firstSunday, lastSunday).map((weekDate) => {
    const date = formatDateToKoreanYmd(weekDate);

    return {
      date,
      label: date.slice(5).replace('-', '.'),
    };
  });

  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      birthDate: true,
    },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: firstSunday,
        lte: lastSunday,
      },
    },
    select: {
      studentId: true,
      attendanceDate: true,
      status: true,
    },
  });

  const attendanceByStudentAndDate = new Map<string, AttendanceStatus>();

  attendances.forEach((attendance) => {
    attendanceByStudentAndDate.set(
      `${attendance.studentId}:${formatDateToKoreanYmd(attendance.attendanceDate)}`,
      attendance.status,
    );
  });

  const sortedStudents = sortStudentsByGradeDescThenName(
    students.map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDate(student.birthDate),
    })),
  );

  return {
    schoolYearStart,
    schoolYearEnd,
    weeks,
    students: sortedStudents.map((student) => {
      const attendanceByDate = Object.fromEntries(
        weeks.map((week) => {
          const attendanceStatus =
            attendanceByStudentAndDate.get(`${student.id}:${week.date}`) ?? AttendanceStatus.ABSENT;

          return [week.date, attendanceStatus];
        }),
      );

      return {
        id: student.id,
        name: student.name,
        gradeLabel: student.gradeLabel,
        attendanceByDate,
      };
    }),
  };
}
export async function updateStudentTalent(studentId: string, amount: number, teacherId: string) {
  await runSerializableTransactionWithRetry(() =>
    prisma.$transaction(
      async (tx) => {
        await tx.student.update({
          where: { id: studentId },
          data: {
            currentTalent: {
              increment: amount,
            },
          },
        });

        await tx.talentTransaction.create({
          data: {
            studentId,
            teacherId,
            reason: TalentTransactionReason.MANUAL_ADJUST,
            amount,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
}

/**
 * 시작 주차부터 종료 주차까지의 일요일 목록(양 끝 포함)을 반환한다.
 */
function getSundaySeriesBetween(startSunday: Date, endSunday: Date): Date[] {
  const result: Date[] = [];
  const cursor = new Date(startSunday);

  while (cursor <= endSunday) {
    result.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return result;
}

/**
 * 특정 연/월의 첫 번째 일요일(00:00, KST 기준)을 반환한다.
 */
function getFirstSundayOfMonthKst(year: number, month: number): Date {
  const firstDay = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`);
  const firstDayWeekIndex = getKoreanWeekdayIndex(firstDay);

  if (firstDayWeekIndex === 0) {
    return firstDay;
  }

  const firstSunday = new Date(firstDay);
  firstSunday.setUTCDate(firstSunday.getUTCDate() + (7 - firstDayWeekIndex));
  return firstSunday;
}

/**
 * 출석 상태 변경과 출석 달란트 트랜잭션을 처리한다.
 */
export async function updateAttendanceWithTalent(
  studentId: string,
  attendanceDate: Date,
  nextStatus: AttendanceStatus,
  teacherId: string,
) {
  await runSerializableTransactionWithRetry(() =>
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

        let talentDelta = 0;

        if (!existingAttendance) {
          await tx.attendance.create({
            data: {
              studentId,
              attendanceDate,
              status: nextStatus,
            },
          });

          if (nextStatus === AttendanceStatus.PRESENT) {
            talentDelta = 1;
          }
        } else if (existingAttendance.status !== nextStatus) {
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

          if (existingAttendance.status === AttendanceStatus.ABSENT && nextStatus === AttendanceStatus.PRESENT) {
            talentDelta = 1;
          } else if (existingAttendance.status === AttendanceStatus.PRESENT && nextStatus === AttendanceStatus.ABSENT) {
            talentDelta = -1;
          }
        }

        if (talentDelta !== 0) {
          await tx.student.update({
            where: { id: studentId },
            data: {
              currentTalent: {
                increment: talentDelta,
              },
            },
          });

          await tx.talentTransaction.create({
            data: {
              studentId,
              teacherId,
              reason: TalentTransactionReason.ATTENDANCE,
              amount: talentDelta,
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
}

/**
 * 클라이언트가 인지한 현재 상태를 기준으로 출석 상태를 변경한다.
 * 동시 수정으로 상태가 달라졌다면 충돌로 처리한다.
 */
export async function updateAttendanceWithExpectedStatus(
  studentId: string,
  attendanceDate: Date,
  expectedCurrentStatus: AttendanceStatus,
  nextStatus: AttendanceStatus,
  teacherId: string,
): Promise<'updated' | 'stale_state'> {
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

        if (currentStatus !== expectedCurrentStatus) {
          return 'stale_state' as const;
        }

        if (currentStatus === nextStatus) {
          return 'stale_state' as const;
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

        if (talentDelta !== 0) {
          await tx.student.update({
            where: { id: studentId },
            data: {
              currentTalent: {
                increment: talentDelta,
              },
            },
          });

          await tx.talentTransaction.create({
            data: {
              studentId,
              teacherId,
              reason: TalentTransactionReason.ATTENDANCE,
              amount: talentDelta,
            },
          });
        }

        return 'updated' as const;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
}

/**
 * 직렬화 충돌 재시도 대상 에러인지 확인한다.
 */
function isRetryableSerializableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

/**
 * 지정한 시간(ms)만큼 비동기 대기한다.
 */
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * 직렬화 충돌(P2034) 발생 시 지정 횟수만큼 트랜잭션을 재시도한다.
 */
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

/**
 * 한국 시간 기준 요일 인덱스(일 0, 토 6)를 반환한다.
 */
function getKoreanWeekdayIndex(date: Date): number {
  const shortWeekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date);

  return KOREAN_WEEKDAY_INDEX_BY_SHORT_NAME[shortWeekdayName] ?? 0;
}

/**
 * 한국 시간 기준 현재 주의 일요일 00:00 Date 값을 반환한다.
 */
function getCurrentSundayKstDate(baseDate: Date = new Date()): Date {
  const todayKoreanYmd = formatDateToKoreanYmd(baseDate);
  const todayKstMidnight = new Date(`${todayKoreanYmd}T00:00:00+09:00`);
  const weekdayIndex = getKoreanWeekdayIndex(baseDate);
  const currentSunday = new Date(todayKstMidnight);

  currentSunday.setUTCDate(currentSunday.getUTCDate() - weekdayIndex);

  return currentSunday;
}

/**
 * 한국 시간 기준 다음 주의 일요일 00:00 Date 값을 반환한다.
 */
function getNextSundayKstDate(currentSundayKstDate: Date): Date {
  const nextSunday = new Date(currentSundayKstDate);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);

  return nextSunday;
}

/**
 * Date를 MM/DD 형식 문자열로 변환한다.
 */
function formatDateToMmDd(dateValue: Date): string {
  const ymd = formatDateToKoreanYmd(dateValue);
  return ymd.slice(5);
}

/**
 * 기준 일요일에서 지정한 주 수만큼 이전 일요일 Date를 반환한다.
 */
function getPreviousSundayByWeeks(currentSundayKstDate: Date, weeksAgo: number): Date {
  const targetSunday = new Date(currentSundayKstDate);
  targetSunday.setUTCDate(targetSunday.getUTCDate() - weeksAgo * 7);
  return targetSunday;
}

/**
 * 최근 약 3개월(12주) 범위의 주간(일요일) 시계열을 반환한다.
 */
function getWeeklySundaySeriesForLastThreeMonths(currentSundayKstDate: Date): Date[] {
  const series: Date[] = [];
  for (let weeksAgo = 12; weeksAgo >= 0; weeksAgo -= 1) {
    series.push(getPreviousSundayByWeeks(currentSundayKstDate, weeksAgo));
  }

  return series;
}

/**
 * 특정 연/월의 마지막 일요일(한국시간)을 반환한다.
 */
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

/**
 * 한국시간 기준 오늘 날짜로 현재 분기를 반환한다.
 * 3/6/9/12월의 마지막 일요일 포함 이전까지 각각 1~4분기로 계산한다.
 */
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

/**
 * 분기에 해당하는 월 범위를 반환한다.
 */
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

/**
 * 분기 종료 월(3/6/9/12)을 반환한다.
 */
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

/**
 * 학생 생일 목록을 학년 우선, 같은 학년 내 이름순으로 정렬한다.
 */
function sortBirthdayStudents(students: BirthdayStudentRow[]): BirthdayStudentRow[] {
  return sortStudentsByGradeDescThenName(students);
}

/**
 * 생년월일 기준으로 현재 학년 라벨을 계산한다.
 */
function getGradeLabelByBirthDate(birthDate: Date): StudentRow['gradeLabel'] {
  const today = new Date();
  const schoolYear = today.getMonth() + 1 >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const gradeNumber = schoolYear - birthDate.getFullYear() - 6;

  if (gradeNumber >= 1 && gradeNumber <= 6) {
    return `${gradeNumber}학년` as StudentRow['gradeLabel'];
  }

  return '유아부';
}

/**
 * 탭 기준으로 학생 목록을 필터링한다.
 */
function filterStudentsByTab(students: StudentRow[], selectedTab: AttendanceTabKey): StudentRow[] {
  if (selectedTab === 'all' || selectedTab === 'this_week') {
    return students;
  }

  const gradeLabelByTab: Record<Exclude<AttendanceTabKey, 'all' | 'this_week'>, StudentRow['gradeLabel']> = {
    grade_6: '6학년',
    grade_5: '5학년',
    grade_4: '4학년',
    grade_3: '3학년',
    grade_2: '2학년',
    grade_1: '1학년',
    kindergarten: '유아부',
  };

  return students.filter((student) => student.gradeLabel === gradeLabelByTab[selectedTab]);
}
