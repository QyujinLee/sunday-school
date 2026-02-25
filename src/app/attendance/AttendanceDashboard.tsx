'use client';

import { useMemo } from 'react';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import AttendanceTrendChart from '@/components/common/AttendanceTrendChart';
import { usePersistentToggle } from '@/hooks/usePersistentToggle';
import RefreshCalendarButton from './RefreshCalendarButton';

type BirthdayStudentItem = {
  id: string;
  name: string;
  gradeLabel: string;
};

type TeacherBirthdayItem = {
  id: string;
  displayName: string;
};

type TrendItem = {
  label: string;
  count: number;
};

type AttendanceDashboardProps = {
  currentQuarter: number;
  shouldShowBirthdayPartyBanner: boolean;
  quarterlyBirthdayStudents: BirthdayStudentItem[];
  thisMonthTeacherBirthdays: TeacherBirthdayItem[];
  nextMonthTeacherBirthdays: TeacherBirthdayItem[];
  todayPresentCount: number;
  weeklyTrend: TrendItem[];
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
  onRefreshWeeklyCalendar: () => Promise<void>;
};

const ATTENDANCE_DASHBOARD_EXPAND_STORAGE_KEY = 'attendance_dashboard_expand_state';
const ATTENDANCE_DASHBOARD_EXPAND_EVENT_NAME = 'attendance-dashboard-expand-change';
const GRADE_GROUP_ORDER = ['6학년', '5학년', '4학년', '3학년', '2학년', '1학년', '유아부'] as const;

/**
 * 분기 생일자 목록을 학년별로 그룹핑한다.
 */
function groupBirthdayStudentsByGrade(students: BirthdayStudentItem[]): Array<{
  gradeLabel: string;
  students: BirthdayStudentItem[];
}> {
  const groupedMap = new Map<string, BirthdayStudentItem[]>();

  students.forEach((student) => {
    const existing = groupedMap.get(student.gradeLabel);
    if (existing) {
      existing.push(student);
      return;
    }

    groupedMap.set(student.gradeLabel, [student]);
  });

  const orderedGroups = GRADE_GROUP_ORDER.filter((gradeLabel) => groupedMap.has(gradeLabel)).map((gradeLabel) => ({
    gradeLabel,
    students: groupedMap.get(gradeLabel) ?? [],
  }));
  const restGroups = [...groupedMap.entries()]
    .filter(([gradeLabel]) => !GRADE_GROUP_ORDER.includes(gradeLabel as (typeof GRADE_GROUP_ORDER)[number]))
    .map(([gradeLabel, groupedStudents]) => ({
      gradeLabel,
      students: groupedStudents,
    }));

  return [...orderedGroups, ...restGroups];
}

/**
 * YYYY-MM-DD 문자열을 YYYY.MM.DD 형식으로 변환한다.
 */
function formatYmdToDottedDate(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return '-';
  }

  return dateValue.replace(/-/g, '.');
}

/**
 * 출석관리 상단 대시보드를 렌더링한다.
 */
export default function AttendanceDashboard({
  currentQuarter,
  shouldShowBirthdayPartyBanner,
  quarterlyBirthdayStudents,
  thisMonthTeacherBirthdays,
  nextMonthTeacherBirthdays,
  todayPresentCount,
  weeklyTrend,
  currentWeekCalendarSummary,
  nextWeekCalendarSummary,
  onRefreshWeeklyCalendar,
}: AttendanceDashboardProps) {
  const { isExpanded, toggle } = usePersistentToggle({
    storageKey: ATTENDANCE_DASHBOARD_EXPAND_STORAGE_KEY,
    eventName: ATTENDANCE_DASHBOARD_EXPAND_EVENT_NAME,
    defaultDesktopExpanded: true,
  });

  const birthdayGroups = useMemo(
    () => groupBirthdayStudentsByGrade(quarterlyBirthdayStudents),
    [quarterlyBirthdayStudents],
  );

  /**
   * 대시보드 펼침/접힘 상태를 토글한다.
   */
  function handleToggleExpanded() {
    toggle();
  }

  return (
    <section className="mx-auto mb-6 w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[var(--color-text)]">대시보드</h2>
        <button
          type="button"
          onClick={handleToggleExpanded}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? '대시보드 접기' : '대시보드 펼치기'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
          isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="surface-gradient rounded-xl border border-[var(--color-primary)] p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">주간 일정</h3>
                <form action={onRefreshWeeklyCalendar}>
                  <RefreshCalendarButton />
                </form>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {[
                  { title: '금주', summary: currentWeekCalendarSummary },
                  { title: '차주', summary: nextWeekCalendarSummary },
                ].map((item) => (
                  <article key={item.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <h4 className="text-sm font-semibold text-[var(--color-text)]">{item.title} 예배 일정</h4>
                    <dl className="mt-2 grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">예배 날짜</dt>
                        <dd className="font-semibold text-[var(--color-text)]">
                          {formatYmdToDottedDate(item.summary?.worshipDate)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">사회</dt>
                        <dd className="font-semibold text-[var(--color-text)]">{item.summary?.socialLeader ?? '-'}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--color-muted)]">단상</dt>
                        <dd className="font-semibold text-[var(--color-text)]">{item.summary?.pulpitLeader ?? '-'}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <h5 className="text-sm font-semibold text-[var(--color-text)]">{item.title} 주간일정</h5>
                      {item.summary && item.summary.weeklySchedules.length > 0 ? (
                        <ul className="mt-2 grid gap-1 text-sm text-[var(--color-text)]">
                          {item.summary.weeklySchedules.map((schedule, index) => (
                            <li
                              key={`${item.title}-${schedule}-${index}`}
                              className="rounded-md bg-[var(--color-primary-soft)] px-3 py-2"
                            >
                              {schedule}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--color-muted)]">{item.title} 주간 일정이 없습니다.</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">출석 인원 추이</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                금일 출석 인원(금주 기준):{' '}
                <span className="font-semibold text-[var(--color-text)]">{todayPresentCount}명</span>
              </p>
              <div className="mt-3">
                <AttendanceTrendChart data={weeklyTrend} />
              </div>
            </article>

            <article className="surface-gradient rounded-xl border border-[var(--color-primary)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{currentQuarter}분기 학생 생일자</h3>
                {shouldShowBirthdayPartyBanner ? (
                  <p className="inline-flex w-fit items-center rounded-full border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold text-[var(--color-danger)] shadow-sm">
                    금주는 생일자 파티입니다 🎉
                  </p>
                ) : null}
              </div>

              {birthdayGroups.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-muted)]">해당 분기 생일자가 없습니다.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {birthdayGroups.map((group) => (
                    <article key={group.gradeLabel} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--color-muted)]">{group.gradeLabel}</p>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {group.students.map((student) => (
                          <li
                            key={student.id}
                            className="inline-flex items-center rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)]"
                          >
                            {student.name}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="surface-gradient rounded-xl border border-[var(--color-primary)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">교사 생일자 (이번달 / 다음달)</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted)]">이번달</p>
                  {thisMonthTeacherBirthdays.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">없음</p>
                  ) : (
                    <ul className="mt-1 grid gap-1 text-sm">
                      {thisMonthTeacherBirthdays.map((teacher) => (
                        <li key={teacher.id} className="break-all font-medium text-[var(--color-text)]">
                          {teacher.displayName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted)]">다음달</p>
                  {nextMonthTeacherBirthdays.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">없음</p>
                  ) : (
                    <ul className="mt-1 grid gap-1 text-sm">
                      {nextMonthTeacherBirthdays.map((teacher) => (
                        <li key={teacher.id} className="break-all font-medium text-[var(--color-text)]">
                          {teacher.displayName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
