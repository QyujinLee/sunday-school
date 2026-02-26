import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getAttendancePageData } from '@/server/attendance/service';

import AttendanceDashboard from '../attendance/AttendanceDashboard';

/**
 * 대시보드 페이지를 렌더링한다.
 */
export default async function DashboardPage() {
  const attendancePageData = await getAttendancePageData('all');

  /**
   * 대시보드의 주간 일정 데이터를 수동 새로고침한다.
   */
  async function handleRefreshWeeklyCalendar() {
    'use server';

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      redirect('/dashboard');
    }

    revalidatePath('/dashboard');
    revalidatePath('/attendance');
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-8 sm:px-6">
      <AttendanceDashboard
        currentQuarter={attendancePageData.currentQuarter}
        shouldShowBirthdayPartyBanner={attendancePageData.shouldShowBirthdayPartyBanner}
        quarterlyBirthdayStudents={attendancePageData.quarterlyBirthdayStudents}
        thisMonthTeacherBirthdays={attendancePageData.thisMonthTeacherBirthdays}
        nextMonthTeacherBirthdays={attendancePageData.nextMonthTeacherBirthdays}
        todayPresentCount={attendancePageData.todayPresentCount}
        weeklyTrend={attendancePageData.weeklyTrend}
        currentWeekCalendarSummary={attendancePageData.currentWeekCalendarSummary}
        nextWeekCalendarSummary={attendancePageData.nextWeekCalendarSummary}
        onRefreshWeeklyCalendar={handleRefreshWeeklyCalendar}
      />
    </main>
  );
}
