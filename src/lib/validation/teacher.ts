import { z } from 'zod';

import { normalizePhoneValue, normalizeTextValue } from '@/lib/validation/student';

export const TEACHER_GRADE_OPTIONS = ['유아부', '1학년', '2학년', '3학년', '4학년', '5학년', '6학년'] as const;

const PHONE_NUMBER_REGEX = /^010-\d{4}-\d{4}$/;

export type TeacherUpdatePayload = {
  name: string;
  phone: string;
  birth_date: string;
  grade: string;
  is_active?: boolean;
};

export const teacherUpdateSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.'),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || PHONE_NUMBER_REGEX.test(value), '연락처는 010-0000-0000 형식으로 입력해 주세요.'),
  birth_date: z.string().trim().optional(),
  grade: z.preprocess((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue === '' ? undefined : trimmedValue;
  }, z.enum(TEACHER_GRADE_OPTIONS).optional()),
  is_active: z.boolean().optional(),
});

/**
 * 요청 본문을 정규화한 뒤 교사 수정 스키마로 검증한다.
 * is_active는 관리자만 변경할 수 있으므로 관리자가 아니면 검증 대상에서 제외한다.
 */
export function parseTeacherUpdateInput(payload: Partial<TeacherUpdatePayload>, canChangeActiveState: boolean) {
  return teacherUpdateSchema.safeParse({
    name: normalizeTextValue(payload.name),
    phone: normalizePhoneValue(payload.phone),
    birth_date: normalizeTextValue(payload.birth_date),
    grade: normalizeTextValue(payload.grade),
    is_active: canChangeActiveState ? Boolean(payload.is_active) : undefined,
  });
}
