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

