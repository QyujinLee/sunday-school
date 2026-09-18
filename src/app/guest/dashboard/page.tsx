import type { Metadata } from 'next';

import { getGuestDashboardData } from '@/server/guest/demo-data';

import AttendanceDashboard from '../../attendance/AttendanceDashboard';

export const metadata: Metadata = {
  title: '게스트 대시보드',
};

/**
 * 데모 데이터로 대시보드 화면을 렌더링한다.
 * 실제 DB를 조회하지 않으며, 쓰기 동작(주간 일정 새로고침)은 노출하지 않는다.
 */
export default function GuestDashboardPage() {
  const demoData = getGuestDashboardData();

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-8 sm:px-6">
      <AttendanceDashboard {...demoData} canRefreshCalendar={false} />
    </main>
  );
}
