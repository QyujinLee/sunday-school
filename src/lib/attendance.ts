import { addWeeks, getCurrentSundayKstDate, getKoreanYear } from '@/utils/date';
import type { StudentGradeLabel } from '@/utils/grade';

/**
 * 이번 주 출석 기준 일요일과 다음 주 일요일(수정 마감)을 반환한다.
 */
export function getAttendancePeriodInfo(baseDate: Date = new Date()): {
  attendanceDate: Date;
  nextSundayDate: Date;
} {
  const attendanceDate = getCurrentSundayKstDate(baseDate);

  return {
    attendanceDate,
    nextSundayDate: addWeeks(attendanceDate, 1),
  };
}

/**
 * 출석 관리 탭 정의. 클라이언트 컴포넌트에서도 쓰므로 DB 의존성이 없는 순수 모듈로 둔다.
 * gradeLabel이 있는 탭은 해당 학년만, 없는 탭('금주 출석'/'전체')은 전체 학생을 대상으로 한다.
 */
export const ATTENDANCE_TABS = [
  { key: 'this_week', label: '금주 출석' },
  { key: 'all', label: '전체' },
  { key: 'grade_6', label: '6학년', gradeLabel: '6학년' },
  { key: 'grade_5', label: '5학년', gradeLabel: '5학년' },
  { key: 'grade_4', label: '4학년', gradeLabel: '4학년' },
  { key: 'grade_3', label: '3학년', gradeLabel: '3학년' },
  { key: 'grade_2', label: '2학년', gradeLabel: '2학년' },
  { key: 'grade_1', label: '1학년', gradeLabel: '1학년' },
  { key: 'kindergarten', label: '유아부', gradeLabel: '유아부' },
] as const satisfies ReadonlyArray<{ key: string; label: string; gradeLabel?: StudentGradeLabel }>;

export type AttendanceTabKey = (typeof ATTENDANCE_TABS)[number]['key'];

/**
 * 쿼리스트링 값을 출석 탭 키로 변환한다. 알 수 없는 값이면 '금주 출석'을 반환한다.
 */
export function getSelectedAttendanceTab(tabValue: string | string[] | undefined): AttendanceTabKey {
  const resolvedValue = Array.isArray(tabValue) ? tabValue[0] : tabValue;
  return ATTENDANCE_TABS.find((tab) => tab.key === resolvedValue)?.key ?? 'this_week';
}

/**
 * 선택한 탭에 맞게 학생 목록을 거른다. '금주 출석' 탭은 출석한 학생만 남긴다.
 */
export function filterStudentsByAttendanceTab<T extends { gradeLabel: string; attendanceStatus: string }>(
  students: T[],
  selectedTab: AttendanceTabKey
): T[] {
  if (selectedTab === 'this_week') {
    return students.filter((student) => student.attendanceStatus === 'PRESENT');
  }

  const selectedTabInfo = ATTENDANCE_TABS.find((tab) => tab.key === selectedTab);
  const targetGradeLabel = selectedTabInfo && 'gradeLabel' in selectedTabInfo ? selectedTabInfo.gradeLabel : null;

  return targetGradeLabel ? students.filter((student) => student.gradeLabel === targetGradeLabel) : students;
}

/**
 * 성별 코드를 한글 라벨로 변환한다.
 */
export function getGenderLabel(gender: 'MALE' | 'FEMALE'): string {
  return gender === 'MALE' ? '남' : '여';
}

/**
 * 학년 표시 문자열을 반환한다. 유아부는 연 나이를 함께 표시한다.
 */
export function getGradeDisplayLabel(student: { gradeLabel: string; birthDate: Date | string }): string {
  if (student.gradeLabel !== '유아부') {
    return student.gradeLabel;
  }

  const yearlyAge = Math.max(0, getKoreanYear(new Date()) - getKoreanYear(new Date(student.birthDate)));
  return `유아부 (연 ${yearlyAge}세)`;
}
