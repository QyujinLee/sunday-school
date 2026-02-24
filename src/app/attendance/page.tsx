import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AttendanceStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  ATTENDANCE_TABS,
  TALENT_ADJUST_VALUES,
  getAttendancePageData,
  getGenderLabel,
  getGradeDisplayLabel,
  getSelectedAttendanceTab,
  updateAttendanceWithTalent,
  updateStudentTalent,
  type AttendanceTabKey,
  type StudentRow,
  type TalentLogRow,
} from '@/server/attendance/service';
import { formatDateToKoreanYmd } from '@/utils/date';

import AttendanceDashboard from './AttendanceDashboard';
import AttendanceResultToast from './AttendanceResultToast';
import CollapsiblePanel from './CollapsiblePanel';

type AttendancePageProps = {
  searchParams?: Promise<{
    attendance_tab?: string | string[];
  }>;
};

/**
 * 금주 출석 탭 모바일 카드 목록을 렌더링한다.
 */
function WeeklyAttendanceCardList({
  students,
  selectedTab,
  onAdjustTalent,
}: {
  students: StudentRow[];
  selectedTab: AttendanceTabKey;
  onAdjustTalent: (formData: FormData) => Promise<void>;
}) {
  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        표시할 학생이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {students.map((student) => (
        <li key={student.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-[var(--color-text)]">{student.name}</p>
            <p className="text-sm font-medium text-[var(--color-primary)]">{getGradeDisplayLabel(student)}</p>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            금주 추가 달란트:{' '}
            <span className="font-semibold text-[var(--color-text)]">
              {student.weeklyExtraTalent > 0 ? `+${student.weeklyExtraTalent}` : student.weeklyExtraTalent}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['3', '2', '1'].map((amount) => (
              <form key={`${student.id}-${amount}`} action={onAdjustTalent}>
                <input type="hidden" name="student_id" value={student.id} />
                <input type="hidden" name="amount" value={amount} />
                <input type="hidden" name="attendance_tab" value={selectedTab} />
                <button
                  type="submit"
                  className="inline-flex h-8 min-w-[42px] items-center justify-center rounded-full border border-[var(--color-success)] bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-success)] shadow-sm transition-all hover:bg-[var(--color-success-soft)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-success)] focus-visible:ring-offset-2"
                >
                  +{amount}
                </button>
              </form>
            ))}
            <form action={onAdjustTalent}>
              <input type="hidden" name="student_id" value={student.id} />
              <input type="hidden" name="amount" value="-1" />
              <input type="hidden" name="attendance_tab" value={selectedTab} />
              <button
                type="submit"
                className="inline-flex h-8 min-w-[42px] items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-danger)] shadow-sm transition-all hover:bg-[var(--color-danger-soft)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2"
              >
                -1
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 일반 출석 탭 모바일 카드 목록을 렌더링한다.
 */
function AttendanceCardList({
  students,
  selectedTab,
  onToggleAttendance,
}: {
  students: StudentRow[];
  selectedTab: AttendanceTabKey;
  onToggleAttendance: (formData: FormData) => Promise<void>;
}) {
  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        표시할 학생이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {students.map((student) => {
        const isPresent = student.attendanceStatus === AttendanceStatus.PRESENT;
        const nextStatus = isPresent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;

        return (
          <li key={student.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-[var(--color-text)]">{student.name}</p>
              <p className="text-sm font-medium text-[var(--color-primary)]">{getGradeDisplayLabel(student)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-[var(--color-muted)]">성별</dt>
              <dd className="text-right text-[var(--color-text)]">{getGenderLabel(student.gender)}</dd>
              <dt className="text-[var(--color-muted)]">생일</dt>
              <dd className="text-right text-[var(--color-text)]">{formatDateToKoreanYmd(student.birthDate)}</dd>
            </dl>
            <div className="mt-3 flex justify-end">
              <form action={onToggleAttendance}>
                <input type="hidden" name="student_id" value={student.id} />
                <input type="hidden" name="next_status" value={nextStatus} />
                <input type="hidden" name="attendance_tab" value={selectedTab} />
                <button
                  type="submit"
                  className={`inline-flex h-8 min-w-[68px] items-center justify-center rounded-full border px-3 text-xs font-medium shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isPresent
                      ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:opacity-90 focus-visible:ring-[var(--color-danger)]'
                      : 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)] hover:opacity-90 focus-visible:ring-[var(--color-success)]'
                  }`}
                >
                  {isPresent ? '결석' : '출석'}
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 달란트 변동 기록 모바일 카드 목록을 렌더링한다.
 */
function TalentLogCardList({ logs }: { logs: TalentLogRow[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        기록된 로그가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">{log.student.name}</p>
            <p className={`text-sm font-semibold ${log.amount >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'}`}>
              {log.amount > 0 ? `+${log.amount}` : log.amount}
            </p>
          </div>
          <p className="mt-1 break-all text-xs text-[var(--color-muted)]">
            처리 교사: {log.teacher?.name ?? log.teacher?.email ?? '-'}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            시각:{' '}
            {new Intl.DateTimeFormat('ko-KR', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Asia/Seoul',
            }).format(log.transactedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * 출석 관리 페이지를 렌더링한다.
 */
export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTab = getSelectedAttendanceTab(resolvedSearchParams?.attendance_tab);
  const attendancePageData = await getAttendancePageData(selectedTab);
  const {
    attendanceDate,
    nextSundayDate,
    currentQuarter,
    shouldShowBirthdayPartyBanner,
    quarterlyBirthdayStudents,
    thisMonthTeacherBirthdays,
    nextMonthTeacherBirthdays,
    todayPresentCount,
    weeklyTrend,
    studentsForTable,
    talentLogs,
  } = attendancePageData;

  /**
   * 출석 토글 액션을 처리한다.
   */
  async function handleToggleAttendance(formData: FormData) {
    'use server';

    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;
    const studentId = formData.get('student_id');
    const nextStatus = formData.get('next_status');
    const attendanceTabValue = formData.get('attendance_tab');
    const currentTab = getSelectedAttendanceTab(
      typeof attendanceTabValue === 'string' ? attendanceTabValue : undefined
    );

    if (!teacherId) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=forbidden`);
    }

    if (typeof studentId !== 'string' || !studentId) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=invalid_request`);
    }

    if (nextStatus !== AttendanceStatus.PRESENT && nextStatus !== AttendanceStatus.ABSENT) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=invalid_request`);
    }

    try {
      await updateAttendanceWithTalent(studentId, attendanceDate, nextStatus, teacherId);
    } catch {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=server_error`);
    }

    revalidatePath('/attendance');
    redirect(`/attendance?attendance_tab=${currentTab}&success_code=attendance_updated`);
  }

  /**
   * 수동 달란트 증감 액션을 처리한다.
   */
  async function handleAdjustTalent(formData: FormData) {
    'use server';

    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;
    const studentId = formData.get('student_id');
    const amountValue = formData.get('amount');
    const attendanceTabValue = formData.get('attendance_tab');
    const currentTab = getSelectedAttendanceTab(
      typeof attendanceTabValue === 'string' ? attendanceTabValue : undefined
    );

    if (!teacherId) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=forbidden`);
    }

    if (typeof studentId !== 'string' || !studentId) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=invalid_request`);
    }

    if (typeof amountValue !== 'string' || !TALENT_ADJUST_VALUES.has(amountValue)) {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=invalid_request`);
    }

    const amount = Number(amountValue);

    try {
      await updateStudentTalent(studentId, amount, teacherId);
    } catch {
      redirect(`/attendance?attendance_tab=${currentTab}&error_code=server_error`);
    }

    revalidatePath('/attendance');
    redirect(`/attendance?attendance_tab=${currentTab}&success_code=talent_adjusted`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-8 sm:px-6">
      <AttendanceResultToast />

      <AttendanceDashboard
        currentQuarter={currentQuarter}
        shouldShowBirthdayPartyBanner={shouldShowBirthdayPartyBanner}
        quarterlyBirthdayStudents={quarterlyBirthdayStudents}
        thisMonthTeacherBirthdays={thisMonthTeacherBirthdays}
        nextMonthTeacherBirthdays={nextMonthTeacherBirthdays}
        todayPresentCount={todayPresentCount}
        weeklyTrend={weeklyTrend}
      />

      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">출석 관리</h1>
          <p className="text-sm text-[var(--color-muted)]">
            기준 출석일: {formatDateToKoreanYmd(attendanceDate)}
            <span className="block sm:inline">
              <span className="hidden sm:inline"> / </span>
              수정 가능 기한: {formatDateToKoreanYmd(nextSundayDate)} 이전
            </span>
          </p>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="출석 필터 탭">
          {ATTENDANCE_TABS.map((tab) => {
            const isSelected = selectedTab === tab.key;

            return (
              <a
                key={tab.key}
                href={`/attendance?attendance_tab=${tab.key}`}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
                }`}
                aria-current={isSelected ? 'page' : undefined}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-5 sm:hidden">
          {selectedTab === 'this_week' ? (
            <WeeklyAttendanceCardList
              students={studentsForTable}
              selectedTab={selectedTab}
              onAdjustTalent={handleAdjustTalent}
            />
          ) : (
            <AttendanceCardList
              students={studentsForTable}
              selectedTab={selectedTab}
              onToggleAttendance={handleToggleAttendance}
            />
          )}
        </div>

        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          {selectedTab === 'this_week' ? (
            <table className="w-full border-collapse text-center">
              <thead className="bg-[var(--color-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학년</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">금주 추가 달란트</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">달란트 조정</th>
                </tr>
              </thead>
              <tbody>
                {studentsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                      표시할 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  studentsForTable.map((student) => (
                    <tr key={student.id} className="border-t border-[var(--color-border)]">
                      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{getGradeDisplayLabel(student)}</td>
                      <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.name}</td>
                      <td className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">
                        {student.weeklyExtraTalent > 0 ? `+${student.weeklyExtraTalent}` : student.weeklyExtraTalent}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center gap-1.5">
                          {['3', '2', '1'].map((amount) => (
                            <form key={`${student.id}-${amount}`} action={handleAdjustTalent}>
                              <input type="hidden" name="student_id" value={student.id} />
                              <input type="hidden" name="amount" value={amount} />
                              <input type="hidden" name="attendance_tab" value={selectedTab} />
                              <button
                                type="submit"
                                className="inline-flex h-8 min-w-[42px] items-center justify-center rounded-full border border-[var(--color-success)] bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-success)] shadow-sm transition-all hover:bg-[var(--color-success-soft)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-success)] focus-visible:ring-offset-2"
                              >
                                +{amount}
                              </button>
                            </form>
                          ))}
                          <form action={handleAdjustTalent}>
                            <input type="hidden" name="student_id" value={student.id} />
                            <input type="hidden" name="amount" value="-1" />
                            <input type="hidden" name="attendance_tab" value={selectedTab} />
                            <button
                              type="submit"
                              className="inline-flex h-8 min-w-[42px] items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-danger)] shadow-sm transition-all hover:bg-[var(--color-danger-soft)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2"
                            >
                              -1
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-center">
              <thead className="bg-[var(--color-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학년</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">성별</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">생일</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">출석</th>
                </tr>
              </thead>
              <tbody>
                {studentsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                      표시할 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  studentsForTable.map((student) => {
                    const isPresent = student.attendanceStatus === AttendanceStatus.PRESENT;
                    const nextStatus = isPresent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;

                    return (
                      <tr key={student.id} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{getGradeDisplayLabel(student)}</td>
                        <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.name}</td>
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                          {getGenderLabel(student.gender)}
                        </td>
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                          {formatDateToKoreanYmd(student.birthDate)}
                        </td>
                        <td className="px-2 py-2">
                          <form action={handleToggleAttendance}>
                            <input type="hidden" name="student_id" value={student.id} />
                            <input type="hidden" name="next_status" value={nextStatus} />
                            <input type="hidden" name="attendance_tab" value={selectedTab} />
                            <button
                              type="submit"
                              className={`inline-flex h-8 min-w-[68px] items-center justify-center rounded-full border px-3 text-xs font-medium shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                isPresent
                                  ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:opacity-90 focus-visible:ring-[var(--color-danger)]'
                                  : 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)] hover:opacity-90 focus-visible:ring-[var(--color-success)]'
                              }`}
                            >
                              {isPresent ? '결석' : '출석'}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <CollapsiblePanel
        title="달란트 변동 기록"
        description="출석을 제외한 금주 추가 달란트 조정 내역이 최신순으로 기록됩니다."
      >
        <div className="sm:hidden">
          <TalentLogCardList logs={talentLogs} />
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          <table className="w-full border-collapse text-center">
            <thead className="bg-[var(--color-surface-soft)]">
              <tr>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학생</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">변동</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">처리 교사</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">시각</th>
              </tr>
            </thead>
            <tbody>
              {talentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                    기록된 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                talentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[var(--color-border)]">
                    <td className="px-2 py-2 text-sm text-[var(--color-text)]">{log.student.name}</td>
                    <td
                      className={`px-2 py-2 text-sm font-semibold ${
                        log.amount >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {log.amount > 0 ? `+${log.amount}` : log.amount}
                    </td>
                    <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                      {log.teacher?.name ?? log.teacher?.email ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-sm text-[var(--color-muted)]">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Asia/Seoul',
                      }).format(log.transactedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>
    </main>
  );
}

