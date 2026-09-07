import { describe, expect, it } from 'vitest';

import { formatDateToKoreanYmd, getCurrentAgeInKst, getKoreanDateParts, getKoreanYear } from '@/utils/date';

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
