import {
  getAttendanceInteractiveData,
  getAttendancePeriodInfo,
  getSelectedAttendanceTab,
} from '@/server/attendance/service';
import { formatDateToKoreanYmd } from '@/utils/date';

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
  const { attendanceDate, nextSundayDate } = getAttendancePeriodInfo();
  const interactiveData = await getAttendanceInteractiveData(selectedTab);

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-8 sm:px-6">
      <AttendanceResultToast />

      <AttendanceInteractiveSection
        selectedTab={selectedTab}
        attendanceDateText={formatDateToKoreanYmd(attendanceDate)}
        nextSundayDateText={formatDateToKoreanYmd(nextSundayDate)}
        initialData={{
          studentsForTable: interactiveData.studentsForTable.map((student) => ({
            ...student,
            birthDate: student.birthDate.toISOString(),
          })),
          talentLogs: interactiveData.talentLogs.map((log) => ({
            ...log,
            transactedAt: log.transactedAt.toISOString(),
          })),
        }}
      />
    </main>
  );
}
