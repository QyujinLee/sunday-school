import { describe, expect, it } from 'vitest';

import {
  addWeeks,
  formatDateToKoreanYmd,
  getCurrentAgeInKst,
  getCurrentSundayKstDate,
  getFirstSundayOfMonthKst,
  getKoreanDateParts,
  getKoreanWeekdayIndex,
  getKoreanYear,
  getLastSundayOfMonthKst,
} from '@/utils/date';

describe('formatDateToKoreanYmd', () => {
  it('UTC 자정 직전 시각을 한국시간 기준 다음 날짜로 변환한다', () => {
    // 2026-03-01T15:00:00Z = 2026-03-02 00:00 KST
    expect(formatDateToKoreanYmd(new Date('2026-03-01T15:00:00Z'))).toBe('2026-03-02');
  });

  it('한국시간 기준으로 날짜가 바뀌지 않는 시각은 같은 날짜를 반환한다', () => {
    // 2026-03-01T14:59:59Z = 2026-03-01 23:59:59 KST
    expect(formatDateToKoreanYmd(new Date('2026-03-01T14:59:59Z'))).toBe('2026-03-01');
  });

  it('연말 경계에서 한국시간 기준 연도가 넘어간다', () => {
    // 2025-12-31T15:00:00Z = 2026-01-01 00:00 KST
    expect(formatDateToKoreanYmd(new Date('2025-12-31T15:00:00Z'))).toBe('2026-01-01');
  });

  it('한 자리 월/일을 두 자리로 채운다', () => {
    expect(formatDateToKoreanYmd(new Date('2026-01-05T03:00:00Z'))).toBe('2026-01-05');
  });
});

describe('getKoreanDateParts', () => {
  it('한국시간 기준 연/월/일을 숫자로 반환한다', () => {
    expect(getKoreanDateParts(new Date('2026-03-01T15:00:00Z'))).toEqual({ year: 2026, month: 3, day: 2 });
  });
});

describe('getKoreanYear', () => {
  it('UTC 기준으로는 전년도인 시각도 한국시간 연도로 반환한다', () => {
    expect(getKoreanYear(new Date('2025-12-31T15:00:00Z'))).toBe(2026);
  });
});

describe('getCurrentAgeInKst', () => {
  const birthDate = new Date('2015-06-10T00:00:00+09:00');

  it('생일 하루 전에는 아직 나이를 올리지 않는다', () => {
    expect(getCurrentAgeInKst(birthDate, new Date('2026-06-09T00:00:00+09:00'))).toBe(10);
  });

  it('생일 당일에는 나이를 올린다', () => {
    expect(getCurrentAgeInKst(birthDate, new Date('2026-06-10T00:00:00+09:00'))).toBe(11);
  });

  it('생일 다음 날에는 올라간 나이를 유지한다', () => {
    expect(getCurrentAgeInKst(birthDate, new Date('2026-06-11T00:00:00+09:00'))).toBe(11);
  });

  it('생일이 지나지 않은 달에는 나이를 올리지 않는다', () => {
    expect(getCurrentAgeInKst(birthDate, new Date('2026-05-31T00:00:00+09:00'))).toBe(10);
  });

  it('기준 시각이 UTC 기준 전날이어도 한국시간 날짜로 판정한다', () => {
    // 2026-06-09T15:00:00Z = 2026-06-10 00:00 KST (생일 당일)
    expect(getCurrentAgeInKst(birthDate, new Date('2026-06-09T15:00:00Z'))).toBe(11);
  });
});

describe('getCurrentSundayKstDate', () => {
  it('일요일 KST 자정 직후는 당일 일요일을 반환한다', () => {
    // 2026-10-03T15:00:00Z = 2026-10-04(일) 00:00 KST
    expect(getCurrentSundayKstDate(new Date('2026-10-03T15:00:00Z')).toISOString()).toBe('2026-10-03T15:00:00.000Z');
  });

  it('토요일 KST 23:59는 그 주 일요일을 반환한다', () => {
    // 2026-10-10T14:59:00Z = 2026-10-10(토) 23:59 KST
    expect(formatDateToKoreanYmd(getCurrentSundayKstDate(new Date('2026-10-10T14:59:00Z')))).toBe('2026-10-04');
  });

  it('UTC로는 토요일이지만 KST로 일요일이면 KST 기준으로 계산한다', () => {
    // 2026-10-10T16:00:00Z = 2026-10-11(일) 01:00 KST
    expect(formatDateToKoreanYmd(getCurrentSundayKstDate(new Date('2026-10-10T16:00:00Z')))).toBe('2026-10-11');
  });

  it('월초 일요일이 전월에 있으면 전월 날짜를 반환한다', () => {
    // 2026-03-02(월) 12:00 KST → 2026-03-01(일)
    expect(formatDateToKoreanYmd(getCurrentSundayKstDate(new Date('2026-03-02T03:00:00Z')))).toBe('2026-03-01');
    // 2026-01-01(목) → 2025-12-28(일)
    expect(formatDateToKoreanYmd(getCurrentSundayKstDate(new Date('2026-01-01T03:00:00Z')))).toBe('2025-12-28');
  });
});

describe('addWeeks', () => {
  it('주 단위로 앞뒤 일요일로 이동한다', () => {
    const sunday = getCurrentSundayKstDate(new Date('2026-10-05T03:00:00Z'));

    expect(formatDateToKoreanYmd(addWeeks(sunday, 1))).toBe('2026-10-11');
    expect(formatDateToKoreanYmd(addWeeks(sunday, -12))).toBe('2026-07-12');
  });
});

describe('getFirstSundayOfMonthKst / getLastSundayOfMonthKst', () => {
  it('KST 자정 값으로 첫/마지막 일요일을 반환한다', () => {
    // 2026-03-01은 일요일
    expect(getFirstSundayOfMonthKst(2026, 3).toISOString()).toBe('2026-02-28T15:00:00.000Z');
    expect(formatDateToKoreanYmd(getFirstSundayOfMonthKst(2025, 3))).toBe('2025-03-02');
    expect(getLastSundayOfMonthKst(2026, 12).toISOString()).toBe('2026-12-26T15:00:00.000Z');
    // 2027-02-28은 일요일
    expect(formatDateToKoreanYmd(getLastSundayOfMonthKst(2027, 2))).toBe('2027-02-28');
  });

  it('KST 요일 인덱스를 반환한다', () => {
    expect(getKoreanWeekdayIndex(new Date('2026-10-03T15:00:00Z'))).toBe(0);
  });
});
