type GradeAndName = {
  gradeLabel: string;
  name: string;
  birthDate: Date;
};

const KOREAN_NAME_COLLATOR = new Intl.Collator('ko-KR', {
  numeric: true,
  sensitivity: 'base',
});

/**
 * 학생 목록을 출생연도 오름차순으로 정렬하고, 같은 출생연도라면 이름 가나다순으로 정렬한다.
 */
export function sortStudentsByGradeDescThenName<T extends GradeAndName>(students: T[]): T[] {
  return [...students].sort((a, b) => {
    const birthYearDiff = a.birthDate.getFullYear() - b.birthDate.getFullYear();

    if (birthYearDiff !== 0) {
      return birthYearDiff;
    }

    return KOREAN_NAME_COLLATOR.compare(a.name.trim(), b.name.trim());
  });
}
