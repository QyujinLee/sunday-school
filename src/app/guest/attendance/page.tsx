import type { Metadata } from 'next';

import AttendanceInteractiveSection from '@/app/attendance/AttendanceInteractiveSection';
import { getAttendancePeriodInfo, getSelectedAttendanceTab } from '@/lib/attendance';
import { getGuestAttendanceData } from '@/server/guest/demo-data';
import { formatDateToKoreanYmd } from '@/utils/date';

export const metadata: Metadata = {
  title: '게스트 출석 관리',
};

type GuestAttendancePageProps = {
  searchParams?: Promise<{
    attendance_tab?: string | string[];
  }>;
};

/**
 * 데모 데이터로 출석 관리 화면을 렌더링한다.
 * DB를 조회하지 않고, 출석 토글·달란트 조정 버튼과 재조회를 모두 끈 읽기 전용 상태로 보여준다.
 */
export default async function GuestAttendancePage({ searchParams }: GuestAttendancePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTab = getSelectedAttendanceTab(resolvedSearchParams?.attendance_tab);
  const { attendanceDate, nextSundayDate } = getAttendancePeriodInfo();

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-8 sm:px-6">
      <AttendanceInteractiveSection
        selectedTab={selectedTab}
        attendanceDateText={formatDateToKoreanYmd(attendanceDate)}
        nextSundayDateText={formatDateToKoreanYmd(nextSundayDate)}
        initialData={getGuestAttendanceData(selectedTab)}
        canManage={false}
        basePath="/guest/attendance"
      />
    </main>
  );
}
