import { describe, expect, it } from 'vitest';

import { normalizePhoneValue, parseKstBirthDate, parseStudentInput, toFieldErrorMap } from '@/lib/validation/student';

const validPayload = {
  name: '홍길동',
  gender: 'MALE',
  birth_date: '2019-05-05',
  address: '광주광역시 서구 치평동',
  phone: '',
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
};

describe('normalizePhoneValue', () => {
  it('숫자만 입력해도 하이픈 형식으로 변환한다', () => {
    expect(normalizePhoneValue('01012345678')).toBe('010-1234-5678');
  });

  it('이미 하이픈이 있어도 같은 결과를 반환한다', () => {
    expect(normalizePhoneValue('010-1234-5678')).toBe('010-1234-5678');
  });

  it('빈 값은 빈 문자열로 둔다(선택 입력 허용)', () => {
    expect(normalizePhoneValue('')).toBe('');
    expect(normalizePhoneValue(undefined)).toBe('');
  });

  it('010으로 시작하지 않거나 자릿수가 맞지 않으면 검증에서 걸리도록 표식을 반환한다', () => {
    expect(normalizePhoneValue('0212345678')).toBe('__INVALID_PHONE__');
    expect(normalizePhoneValue('0101234567')).toBe('__INVALID_PHONE__');
  });
});

describe('parseStudentInput', () => {
  it('필수 항목이 모두 있으면 통과한다', () => {
    const result = parseStudentInput(validPayload);

    expect(result.success).toBe(true);
  });

  it('이름이 비어 있으면 실패한다', () => {
    const result = parseStudentInput({ ...validPayload, name: '   ' });

    expect(result.success).toBe(false);
    expect(result.success === false && toFieldErrorMap(result.error).name).toBeTruthy();
  });

  it('성별 값이 유효하지 않으면 실패한다', () => {
    const result = parseStudentInput({ ...validPayload, gender: 'UNKNOWN' });

    expect(result.success).toBe(false);
  });

  it('잘못된 전화번호는 실패한다', () => {
    const result = parseStudentInput({ ...validPayload, phone: '01012345' });

    expect(result.success).toBe(false);
    expect(result.success === false && toFieldErrorMap(result.error).phone).toBeTruthy();
  });

  it('보호자 정보를 일부만 입력하면 실패한다', () => {
    const result = parseStudentInput({ ...validPayload, guardian_name: '홍부모' });

    expect(result.success).toBe(false);
    expect(result.success === false && toFieldErrorMap(result.error).guardian_name).toBeTruthy();
  });

  it('보호자 정보를 모두 입력하면 통과한다', () => {
    const result = parseStudentInput({
      ...validPayload,
      guardian_name: '홍부모',
      guardian_relationship: 'FATHER',
      guardian_phone: '01099998888',
    });

    expect(result.success).toBe(true);
  });

  it('보호자 정보를 모두 비우면 통과한다(보호자 미등록 허용)', () => {
    const result = parseStudentInput(validPayload);

    expect(result.success).toBe(true);
  });
});

describe('parseKstBirthDate', () => {
  it('yyyy-mm-dd 문자열을 한국시간 자정 기준 Date로 변환한다', () => {
    expect(parseKstBirthDate('2019-05-05')?.toISOString()).toBe('2019-05-04T15:00:00.000Z');
  });

  it('형식이 잘못되면 null을 반환한다', () => {
    expect(parseKstBirthDate('2019-13-45')).toBeNull();
    expect(parseKstBirthDate('')).toBeNull();
  });
});

describe('toFieldErrorMap', () => {
  it('필드별로 첫 번째 오류 메시지만 남긴다', () => {
    const result = parseStudentInput({ ...validPayload, name: '', address: '' });

    expect(result.success).toBe(false);

    if (result.success === false) {
      const errors = toFieldErrorMap(result.error);
      expect(Object.keys(errors).sort()).toEqual(['address', 'name']);
    }
  });
});
