const KOREA_TIME_ZONE = 'Asia/Seoul';

/**
 * Date 값을 한국시간 기준 yyyy-mm-dd 문자열로 변환한다.
 */
export function formatDateToKoreanYmd(dateValue: Date): string {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateParts = dateFormatter.formatToParts(dateValue);
  const year = dateParts.find((part) => part.type === 'year')?.value ?? '';
  const month = dateParts.find((part) => part.type === 'month')?.value ?? '';
  const day = dateParts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

/**
 * Date 값을 한국시간 기준 연도/월/일 숫자로 반환한다.
 */
export function getKoreanDateParts(dateValue: Date): { year: number; month: number; day: number } {
  const ymd = formatDateToKoreanYmd(dateValue);
  return {
    year: Number(ymd.slice(0, 4)),
    month: Number(ymd.slice(5, 7)),
    day: Number(ymd.slice(8, 10)),
  };
}

/**
 * Date 값을 한국시간 기준 연도 숫자로 반환한다.
 */
export function getKoreanYear(dateValue: Date): number {
  return getKoreanDateParts(dateValue).year;
}

/**
 * 한국시간 기준 만 나이를 계산한다.
 */
export function getCurrentAgeInKst(birthDate: Date, baseDate: Date = new Date()): number {
  const today = getKoreanDateParts(baseDate);
  const birth = getKoreanDateParts(birthDate);
  let age = today.year - birth.year;
  const hasHadBirthdayThisYear = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}
