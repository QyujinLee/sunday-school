import { describe, expect, it } from 'vitest';

import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';

/**
 * 정렬 테스트용 학생 데이터를 만든다.
 */
function student(name: string, birthDateText: string) {
  return {
    name,
    gradeLabel: '1학년',
    birthDate: new Date(`${birthDateText}T00:00:00+09:00`),
  };
}

describe('sortStudentsByGradeDescThenName', () => {
  it('출생연도가 빠른 학생(고학년)을 먼저 정렬한다', () => {
    const sorted = sortStudentsByGradeDescThenName([
      student('가나', '2019-01-01'),
      student('다라', '2014-01-01'),
      student('마바', '2017-01-01'),
    ]);

    expect(sorted.map((item) => item.name)).toEqual(['다라', '마바', '가나']);
  });

  it('같은 출생연도는 한글 이름 가나다순으로 정렬한다', () => {
    const sorted = sortStudentsByGradeDescThenName([
      student('하늘', '2019-03-01'),
      student('가람', '2019-11-01'),
      student('나무', '2019-07-01'),
    ]);

    expect(sorted.map((item) => item.name)).toEqual(['가람', '나무', '하늘']);
  });

  it('이름 앞뒤 공백은 정렬 기준에서 제외한다', () => {
    const sorted = sortStudentsByGradeDescThenName([student('  하늘', '2019-01-01'), student('가람  ', '2019-01-01')]);

    expect(sorted.map((item) => item.name.trim())).toEqual(['가람', '하늘']);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const students = [student('하늘', '2019-01-01'), student('가람', '2019-01-01')];
    const sorted = sortStudentsByGradeDescThenName(students);

    expect(students.map((item) => item.name)).toEqual(['하늘', '가람']);
    expect(sorted).not.toBe(students);
  });

  it('출생연도 판정은 한국시간 기준으로 한다', () => {
    // 2018-12-31T15:00:00Z = 2019-01-01 KST → 2019년생으로 취급되어 2018년생보다 뒤에 온다
    const sorted = sortStudentsByGradeDescThenName([
      { name: '가나', gradeLabel: '1학년', birthDate: new Date('2018-12-31T15:00:00Z') },
      { name: '다라', gradeLabel: '1학년', birthDate: new Date('2018-12-31T14:00:00Z') },
    ]);

    expect(sorted.map((item) => item.name)).toEqual(['다라', '가나']);
  });
});
