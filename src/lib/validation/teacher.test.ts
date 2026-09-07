import { describe, expect, it } from 'vitest';

import { parseTeacherUpdateInput } from '@/lib/validation/teacher';

const validPayload = {
  name: '김교사',
  phone: '010-1234-5678',
  birth_date: '1990-05-05',
  grade: '3학년',
};

describe('parseTeacherUpdateInput', () => {
  it('필수 항목이 있으면 통과한다', () => {
    const result = parseTeacherUpdateInput(validPayload, true);

    expect(result.success).toBe(true);
  });

  it('이름이 비어 있으면 실패한다', () => {
    expect(parseTeacherUpdateInput({ ...validPayload, name: '' }, true).success).toBe(false);
  });

  it('연락처와 생년월일, 담당학년은 비워도 통과한다', () => {
    const result = parseTeacherUpdateInput({ name: '김교사', phone: '', birth_date: '', grade: '' }, true);

    expect(result.success).toBe(true);
  });

  it('담당학년 목록에 없는 값은 실패한다', () => {
    expect(parseTeacherUpdateInput({ ...validPayload, grade: '중등부' }, true).success).toBe(false);
  });

  it('잘못된 연락처 형식은 실패한다', () => {
    expect(parseTeacherUpdateInput({ ...validPayload, phone: '02-123-4567' }, true).success).toBe(false);
  });

  it('관리자는 활성 상태 값을 반영한다', () => {
    const result = parseTeacherUpdateInput({ ...validPayload, is_active: false }, true);

    expect(result.success && result.data.is_active).toBe(false);
  });

  it('일반 교사 요청에서는 활성 상태 값이 무시된다', () => {
    const result = parseTeacherUpdateInput({ ...validPayload, is_active: false }, false);

    expect(result.success && result.data.is_active).toBeUndefined();
  });
});
