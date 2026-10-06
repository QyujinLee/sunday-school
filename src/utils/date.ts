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

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 한국시간 기준 연/월/일의 자정(00:00 KST) Date를 만든다. 일 값이 범위를 넘으면 앞뒤 달로 이어진다.
 */
function toKstMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_MS);
}

/**
 * 한국시간 기준 요일 인덱스(일=0 ~ 토=6)를 반환한다.
 */
export function getKoreanWeekdayIndex(dateValue: Date): number {
  const { year, month, day } = getKoreanDateParts(dateValue);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * 기준 시각이 속한 주(일~토)의 일요일 00:00(KST)을 반환한다.
 */
export function getCurrentSundayKstDate(baseDate: Date = new Date()): Date {
  const { year, month, day } = getKoreanDateParts(baseDate);
  return toKstMidnight(year, month, day - getKoreanWeekdayIndex(baseDate));
}

/**
 * 날짜에 주 단위(7일)를 더한다. 음수면 이전 주로 이동한다.
 */
export function addWeeks(dateValue: Date, weeks: number): Date {
  return new Date(dateValue.getTime() + weeks * 7 * DAY_MS);
}

/**
 * 해당 연/월의 첫 번째 일요일 00:00(KST)을 반환한다.
 */
export function getFirstSundayOfMonthKst(year: number, month: number): Date {
  const firstDayWeekdayIndex = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return toKstMidnight(year, month, 1 + ((7 - firstDayWeekdayIndex) % 7));
}

/**
 * 해당 연/월의 마지막 일요일 00:00(KST)을 반환한다.
 */
export function getLastSundayOfMonthKst(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month, 0));
  return toKstMidnight(year, month, lastDay.getUTCDate() - lastDay.getUTCDay());
}
