import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { z } from 'zod';

import RestrictedInput from '@/components/common/RestrictedInput';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDateToKoreanYmd } from '@/utils/date';
import TeacherEditResultToast from './TeacherEditResultToast';

const PHONE_NUMBER_REGEX = /^010-\d{4}-\d{4}$/;
const GRADE_OPTIONS = ['유아부', '1학년', '2학년', '3학년', '4학년', '5학년', '6학년'] as const;
const FIELD_LABEL_BY_KEY: Record<string, string> = {
  name: '이름',
  phone: '연락처',
  birth_date: '생년월일',
  grade: '담당 학년',
  is_active: '활성 상태',
};

type TeacherEditPageProps = {
  params: Promise<{
    teacher_id: string;
  }>;
};

const teacherUpdateSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.'),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || PHONE_NUMBER_REGEX.test(value), '연락처는 010-0000-0000 형식으로 입력해 주세요.'),
  birth_date: z.string().trim().optional(),
  grade: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue;
    },
    z.enum(GRADE_OPTIONS).optional(),
  ),
  is_active: z.boolean().optional(),
});

/**
 * 문자열 입력값을 공백 제거한 텍스트로 정리한다.
 */
function normalizeTextValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 전화번호 입력값을 숫자 기준으로 010-0000-0000 형식으로 정리한다.
 */
function normalizePhoneValue(value: FormDataEntryValue | null): string {
  const rawValue = typeof value === 'string' ? value : '';
  const onlyDigits = rawValue.replace(/\D/g, '');

  if (!onlyDigits) {
    return '';
  }

  if (!/^010\d{8}$/.test(onlyDigits)) {
    return '__INVALID_PHONE__';
  }

  return `${onlyDigits.slice(0, 3)}-${onlyDigits.slice(3, 7)}-${onlyDigits.slice(7, 11)}`;
}

/**
 * 검증 실패 필드 키 목록을 쿼리스트링 문자열로 직렬화한다.
 */
function serializeInvalidFields(fieldKeys: string[]): string {
  const uniqueKeys = Array.from(new Set(fieldKeys)).filter((fieldKey) => FIELD_LABEL_BY_KEY[fieldKey]);
  return uniqueKeys.join(',');
}

/**
 * 교사 정보 수정 페이지를 렌더링한다.
 */
export default async function TeacherEditPage({ params }: TeacherEditPageProps) {
  const session = await getServerSession(authOptions);
  const { teacher_id: teacherId } = await params;
  const isAdmin = session?.user?.role === 'ADMIN';
  const isSelf = session?.user?.id === teacherId;

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!isAdmin && !isSelf) {
    redirect('/teachers');
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      birthDate: true,
      grade: true,
      role: true,
      isActive: true,
    },
  });

  if (!teacher) {
    redirect('/teachers');
  }
  const initialTeacherIsActive = teacher.isActive;

  /**
   * 교사 정보를 수정하고 목록 페이지로 이동한다.
   */
  async function handleUpdateTeacher(formData: FormData) {
    'use server';

    const sessionForAction = await getServerSession(authOptions);
    const isAdminForAction = sessionForAction?.user?.role === 'ADMIN';
    const isSelfForAction = sessionForAction?.user?.id === teacherId;

    if (!sessionForAction?.user?.id || (!isAdminForAction && !isSelfForAction)) {
      redirect('/teachers?error_code=forbidden');
    }

    const parsedResult = teacherUpdateSchema.safeParse({
      name: normalizeTextValue(formData.get('name')),
      phone: normalizePhoneValue(formData.get('phone')),
      birth_date: normalizeTextValue(formData.get('birth_date')),
      grade: normalizeTextValue(formData.get('grade')),
      is_active: isAdminForAction ? formData.get('is_active') === 'on' : undefined,
    });

    if (!parsedResult.success) {
      const invalidFieldKeys = parsedResult.error.issues
        .map((issue) => String(issue.path[0] ?? ''))
        .filter(Boolean);
      const serializedInvalidFields = serializeInvalidFields(invalidFieldKeys);
      const errorQueryString = serializedInvalidFields
        ? `error_code=invalid_input&error_fields=${encodeURIComponent(serializedInvalidFields)}`
        : 'error_code=invalid_input';

      redirect(`/teachers/${teacherId}/edit?${errorQueryString}`);
    }

    const teacherInput = parsedResult.data;
    const birthDate = teacherInput.birth_date ? new Date(`${teacherInput.birth_date}T00:00:00`) : null;

    if (birthDate && Number.isNaN(birthDate.getTime())) {
      redirect(`/teachers/${teacherId}/edit?error_code=invalid_birth_date`);
    }

    try {
      await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          name: teacherInput.name.trim(),
          phone: teacherInput.phone?.trim() || null,
          birthDate,
          grade: teacherInput.grade ?? null,
          isActive: isAdminForAction ? Boolean(teacherInput.is_active) : initialTeacherIsActive,
        },
      });
    } catch {
      redirect(`/teachers/${teacherId}/edit?error_code=server_error`);
    }

    redirect('/teachers?success_code=teacher_updated');
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <TeacherEditResultToast />
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">교사 정보 수정</h1>
          <Link
            href="/teachers"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            목록으로
          </Link>
        </div>

        <form action={handleUpdateTeacher} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">
                이름
                <span className="ml-1 text-[var(--color-primary)]">*</span>
              </span>
              <input
                name="name"
                type="text"
                required
                defaultValue={teacher.name ?? ''}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">이메일</span>
              <input
                type="text"
                value={teacher.email}
                readOnly
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm text-[var(--color-muted)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">연락처</span>
              <RestrictedInput
                filterType="phone"
                name="phone"
                type="text"
                inputMode="numeric"
                defaultValue={teacher.phone ?? ''}
                placeholder="010-0000-0000"
                maxLength={13}
                pattern="010-[0-9]{4}-[0-9]{4}"
                title="010-0000-0000 형식으로 입력해 주세요."
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">생년월일</span>
              <input
                name="birth_date"
                type="date"
                defaultValue={teacher.birthDate ? formatDateToKoreanYmd(teacher.birthDate) : ''}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">담당 학년</span>
              <select
                name="grade"
                defaultValue={teacher.grade ?? ''}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              >
                <option value="" disabled>
                  선택
                </option>
                {GRADE_OPTIONS.map((gradeOption) => (
                  <option key={gradeOption} value={gradeOption}>
                    {gradeOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm text-[var(--color-text)]">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={teacher.isActive}
                disabled={!isAdmin}
                className="h-4 w-4 rounded border border-[var(--color-border-strong)]"
              />
              활성 상태
              {!isAdmin ? <span className="text-xs text-[var(--color-muted)]">(관리자 전용)</span> : null}
            </label>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              수정
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
