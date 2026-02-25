import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getAttendancePageData, getSelectedAttendanceTab } from '@/server/attendance/service';
import { formatDateToKoreanYmd } from '@/utils/date';

import AttendanceDashboard from './AttendanceDashboard';
import AttendanceInteractiveSection from './AttendanceInteractiveSection';
import AttendanceResultToast from './AttendanceResultToast';

type AttendancePageProps = {
  searchParams?: Promise<{
    attendance_tab?: string | string[];
  }>;
};

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
    currentWeekCalendarSummary,
    nextWeekCalendarSummary,
    studentsForTable,
    talentLogs,
  } = attendancePageData;

  /**
   * 금주 예배 일정 캐시를 수동으로 갱신한다.
   */
  async function handleRefreshWeeklyCalendar() {
    'use server';

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      redirect('/attendance?error_code=forbidden');
    }

    revalidatePath('/attendance');
    redirect('/attendance?success_code=calendar_refreshed');
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
        currentWeekCalendarSummary={currentWeekCalendarSummary}
        nextWeekCalendarSummary={nextWeekCalendarSummary}
        onRefreshWeeklyCalendar={handleRefreshWeeklyCalendar}
      />

      <AttendanceInteractiveSection
        selectedTab={selectedTab}
        attendanceDateText={formatDateToKoreanYmd(attendanceDate)}
        nextSundayDateText={formatDateToKoreanYmd(nextSundayDate)}
        initialData={{
          studentsForTable: studentsForTable.map((student) => ({
            ...student,
            birthDate: student.birthDate.toISOString(),
          })),
          talentLogs: talentLogs.map((log) => ({
            ...log,
            transactedAt: log.transactedAt.toISOString(),
          })),
        }}
      />
    </main>
  );
}
