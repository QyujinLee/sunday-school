import { describe, expect, it } from 'vitest';

import { filterStudentsByAttendanceTab, getAttendancePeriodInfo, getSelectedAttendanceTab } from '@/lib/attendance';
import { formatDateToKoreanYmd } from '@/utils/date';

const students = [
  { id: 'a', gradeLabel: '6학년', attendanceStatus: 'PRESENT' },
  { id: 'b', gradeLabel: '6학년', attendanceStatus: 'ABSENT' },
  { id: 'c', gradeLabel: '유아부', attendanceStatus: 'PRESENT' },
  { id: 'd', gradeLabel: '졸업생', attendanceStatus: 'ABSENT' },
];

describe('getSelectedAttendanceTab', () => {
  it('알 수 없는 값이나 빈 값은 금주 출석 탭으로 처리한다', () => {
    expect(getSelectedAttendanceTab(undefined)).toBe('this_week');
    expect(getSelectedAttendanceTab('grade_9')).toBe('this_week');
  });

  it('배열이면 첫 값을 사용한다', () => {
    expect(getSelectedAttendanceTab(['grade_3', 'all'])).toBe('grade_3');
  });
});

describe('filterStudentsByAttendanceTab', () => {
  const ids = (tab: Parameters<typeof filterStudentsByAttendanceTab>[1]) =>
    filterStudentsByAttendanceTab(students, tab).map((student) => student.id);

  it('금주 출석 탭은 출석한 학생만 남긴다', () => {
    expect(ids('this_week')).toEqual(['a', 'c']);
  });

  it('전체 탭은 모두 남긴다', () => {
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('학년 탭은 해당 학년만 남긴다', () => {
    expect(ids('grade_6')).toEqual(['a', 'b']);
    expect(ids('kindergarten')).toEqual(['c']);
  });
});

describe('getAttendancePeriodInfo', () => {
  it('이번 주 일요일과 다음 주 일요일을 반환한다', () => {
    // 2026-10-07(수) 12:00 KST
    const { attendanceDate, nextSundayDate } = getAttendancePeriodInfo(new Date('2026-10-07T03:00:00Z'));

    expect(formatDateToKoreanYmd(attendanceDate)).toBe('2026-10-04');
    expect(formatDateToKoreanYmd(nextSundayDate)).toBe('2026-10-11');
  });
});
