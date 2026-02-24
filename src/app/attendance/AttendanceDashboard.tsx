'use client';

import { useEffect, useState } from 'react';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import AttendanceTrendChart from '@/components/common/AttendanceTrendChart';

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
};

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
}: AttendanceDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');

    /**
     * 화면 너비 기준으로 대시보드 기본 펼침 상태를 동기화한다.
     */
    function handleSyncExpandedByViewport() {
      setIsExpanded(mediaQuery.matches);
    }

    handleSyncExpandedByViewport();
    mediaQuery.addEventListener('change', handleSyncExpandedByViewport);

    return () => {
      mediaQuery.removeEventListener('change', handleSyncExpandedByViewport);
    };
  }, []);

  /**
   * 대시보드 펼침/접힘 상태를 토글한다.
   */
  function handleToggleExpanded() {
    setIsExpanded((previous) => !previous);
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
          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">{currentQuarter}분기 학생 생일자</h3>
              {shouldShowBirthdayPartyBanner ? (
                <p className="inline-flex w-fit items-center rounded-full border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold text-[var(--color-danger)] shadow-sm">
                  금주는 생일자 파티입니다 🎉
                </p>
              ) : null}
            </div>
            {quarterlyBirthdayStudents.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-muted)]">해당 분기 생일자가 없습니다.</p>
            ) : (
              <ul className="mt-3 grid gap-1.5 text-sm">
                {quarterlyBirthdayStudents.map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-2">
                    <span className="text-[var(--color-muted)]">{student.gradeLabel}</span>
                    <span className="font-medium text-[var(--color-text)]">{student.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
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
          </div>
        </div>
      </div>
    </section>
  );
}
