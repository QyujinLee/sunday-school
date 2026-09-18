import { formatDateToKoreanYmd } from '@/utils/date';

/**
 * 게스트 모드에서 보여줄 데모 데이터.
 * 실제 학생·교사 정보가 아니며 DB를 조회하지 않는다.
 */

/**
 * 오늘(KST) 기준으로 주어진 주차의 일요일을 YYYY-MM-DD로 반환한다.
 * 데모 화면이 항상 최근 날짜처럼 보이도록 고정값 대신 계산한다.
 */
function getSundayYmd(weekOffset: number): string {
  const todayKstYmd = formatDateToKoreanYmd(new Date());
  const anchorDate = new Date(`${todayKstYmd}T00:00:00Z`);

  anchorDate.setUTCDate(anchorDate.getUTCDate() - anchorDate.getUTCDay() + weekOffset * 7);

  return anchorDate.toISOString().slice(0, 10);
}

const WEEKLY_PRESENT_COUNTS = [18, 21, 19, 23, 20, 24, 22, 25, 21, 26, 24, 27];

/**
 * 게스트 대시보드에 넘길 데모 데이터를 만든다.
 */
export function getGuestDashboardData() {
  const currentSundayYmd = getSundayYmd(0);
  const currentMonth = Number(currentSundayYmd.slice(5, 7));

  return {
    currentQuarter: Math.ceil(currentMonth / 3),
    shouldShowBirthdayPartyBanner: true,
    quarterlyBirthdayStudents: [
      { id: 'demo-student-1', name: '김하늘', gradeLabel: '6학년' },
      { id: 'demo-student-2', name: '이서준', gradeLabel: '4학년' },
      { id: 'demo-student-3', name: '박지우', gradeLabel: '4학년' },
      { id: 'demo-student-4', name: '최윤아', gradeLabel: '2학년' },
      { id: 'demo-student-5', name: '정도현', gradeLabel: '유아부' },
    ],
    thisMonthTeacherBirthdays: [
      { id: 'demo-teacher-1', displayName: '김선교 선생님' },
      { id: 'demo-teacher-2', displayName: '이믿음 선생님' },
    ],
    nextMonthTeacherBirthdays: [{ id: 'demo-teacher-3', displayName: '박소망 선생님' }],
    todayPresentCount: 27,
    weeklyTrend: WEEKLY_PRESENT_COUNTS.map((count, index) => ({
      label: getSundayYmd(index - (WEEKLY_PRESENT_COUNTS.length - 1)).slice(5),
      count,
    })),
    currentWeekCalendarSummary: {
      title: '사회: 박은혜 / 단상: 김도윤',
      worshipDate: currentSundayYmd,
      socialLeader: '박은혜',
      pulpitLeader: '김도윤',
      weeklySchedules: ['예배 후 교사 회의', '수요일 성경학교 준비 모임', '토요일 찬양 연습'],
    },
    nextWeekCalendarSummary: {
      title: '사회: 김도윤 / 단상: 이믿음',
      worshipDate: getSundayYmd(1),
      socialLeader: '김도윤',
      pulpitLeader: '이믿음',
      weeklySchedules: ['분기 생일잔치', '신입 교사 환영'],
    },
  };
}
