import { describe, expect, it } from 'vitest';

import { getGradeLabelByBirthDateInKst, getSchoolYearInKst } from '@/utils/grade';

/**
 * 한국시간 자정 기준 Date를 만든다.
 */
function kst(dateText: string): Date {
  return new Date(`${dateText}T00:00:00+09:00`);
}

describe('getSchoolYearInKst', () => {
  it('3월 1일부터 해당 연도를 학사연도로 사용한다', () => {
    expect(getSchoolYearInKst(kst('2026-03-01'))).toBe(2026);
  });

  it('2월 말일까지는 이전 연도를 학사연도로 사용한다', () => {
    expect(getSchoolYearInKst(kst('2026-02-28'))).toBe(2025);
  });

  it('1월은 이전 연도를 학사연도로 사용한다', () => {
    expect(getSchoolYearInKst(kst('2026-01-01'))).toBe(2025);
  });

  it('12월은 해당 연도를 학사연도로 사용한다', () => {
    expect(getSchoolYearInKst(kst('2026-12-31'))).toBe(2026);
  });

  it('UTC 기준으로는 2월 28일인 시각도 한국시간 3월 1일이면 새 학사연도로 본다', () => {
    // 2026-02-28T15:00:00Z = 2026-03-01 00:00 KST
    expect(getSchoolYearInKst(new Date('2026-02-28T15:00:00Z'))).toBe(2026);
  });
});

describe('getGradeLabelByBirthDateInKst', () => {
  it('2026학년도 기준 2019년생은 1학년이다', () => {
    expect(getGradeLabelByBirthDateInKst(kst('2019-05-05'), kst('2026-03-01'))).toBe('1학년');
  });

  it('2026학년도 기준 2014년생은 6학년이다', () => {
    expect(getGradeLabelByBirthDateInKst(kst('2014-05-05'), kst('2026-03-01'))).toBe('6학년');
  });

  it('취학 전 연령(2020년생)은 유아부로 분류한다', () => {
    expect(getGradeLabelByBirthDateInKst(kst('2020-05-05'), kst('2026-03-01'))).toBe('유아부');
  });

  it('학년은 생월과 무관하게 출생연도로만 결정된다', () => {
    expect(getGradeLabelByBirthDateInKst(kst('2019-01-01'), kst('2026-03-01'))).toBe('1학년');
    expect(getGradeLabelByBirthDateInKst(kst('2019-12-31'), kst('2026-03-01'))).toBe('1학년');
  });

  it('3월 이전에는 이전 학사연도 학년을 유지한다', () => {
    // 2026-02-28은 2025학년도 → 2019년생은 아직 유아부
    expect(getGradeLabelByBirthDateInKst(kst('2019-05-05'), kst('2026-02-28'))).toBe('유아부');
    // 하루 뒤 새 학년이 시작되면 1학년
    expect(getGradeLabelByBirthDateInKst(kst('2019-05-05'), kst('2026-03-01'))).toBe('1학년');
  });

  it('출생일이 UTC 기준 전년도여도 한국시간 출생연도로 학년을 계산한다', () => {
    // 2018-12-31T15:00:00Z = 2019-01-01 00:00 KST → 2019년생으로 취급
    expect(getGradeLabelByBirthDateInKst(new Date('2018-12-31T15:00:00Z'), kst('2026-03-01'))).toBe('1학년');
  });

  // 알려진 동작: 6학년을 넘어선 연령(중학생)도 유아부로 떨어진다.
  // 학생 목록에서는 만 14세 이상 + 3월 이후 조건으로 졸업생 분리를 하기 때문에
  // 그 사이 구간(예: 2026학년도의 2013년생)은 유아부로 표시된다.
  it('6학년을 넘어선 연령도 현재 구현에서는 유아부로 분류된다', () => {
    expect(getGradeLabelByBirthDateInKst(kst('2013-05-05'), kst('2026-03-01'))).toBe('유아부');
  });
});
