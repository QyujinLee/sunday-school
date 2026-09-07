import { formatDateToKoreanYmd, getKoreanYear } from '@/utils/date';

export type StudentGradeLabel =
  | '졸업생'
  | '6학년'
  | '5학년'
  | '4학년'
  | '3학년'
  | '2학년'
  | '1학년'
  | '유아부';

/**
 * 기준 날짜를 한국 시간 기준 학사연도로 변환한다.
 * 3월 이상이면 해당 연도, 1~2월이면 이전 연도를 학사연도로 사용한다.
 */
export function getSchoolYearInKst(baseDate: Date = new Date()): number {
  const koreanYmd = formatDateToKoreanYmd(baseDate);
  const year = Number(koreanYmd.slice(0, 4));
  const month = Number(koreanYmd.slice(5, 7));

  return month >= 3 ? year : year - 1;
}

/**
 * 생년월일을 기준으로 한국 시간 학사연도에 맞는 학년 라벨을 반환한다.
 * 초등 6학년을 넘긴 연령은 졸업생, 취학 전 연령은 유아부로 분류한다.
 */
export function getGradeLabelByBirthDateInKst(
  birthDate: Date,
  baseDate: Date = new Date(),
): StudentGradeLabel {
  const schoolYear = getSchoolYearInKst(baseDate);
  const birthYearInKst = getKoreanYear(birthDate);
  const gradeNumber = schoolYear - birthYearInKst - 6;

  if (gradeNumber > 6) {
    return '졸업생';
  }

  if (gradeNumber >= 1) {
    return `${gradeNumber}학년` as StudentGradeLabel;
  }

  return '유아부';
}

/**
 * 생년월일이 졸업생(초등 6학년 초과) 연령인지 확인한다.
 */
export function isGraduateByBirthDateInKst(birthDate: Date, baseDate: Date = new Date()): boolean {
  return getGradeLabelByBirthDateInKst(birthDate, baseDate) === '졸업생';
}
