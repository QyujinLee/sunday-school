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
  searchParams?: Promise<{
    name?: string | string[];
    phone?: string | string[];
    birth_date?: string | string[];
    grade?: string | string[];
    is_active?: string | string[];
  }>;
};

type TeacherEditFormValues = {
  name: string;
  phone: string;
  birth_date: string;
  grade: string;
  is_active: boolean;
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
 * 쿼리스트링 값에서 단일 문자열을 추출한다.
 */
function getSingleSearchParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : '';
}

/**
 * 교사 수정 폼 기본값을 생성한다.
 */
function buildFormValues(
  searchParams: Awaited<TeacherEditPageProps['searchParams']> | undefined,
  teacher: {
    name: string | null;
    phone: string | null;
    birthDate: Date | null;
    grade: string | null;
    isActive: boolean;
  },
): TeacherEditFormValues {
  const isActiveParamValue = getSingleSearchParam(searchParams?.is_active);

  return {
    name: getSingleSearchParam(searchParams?.name) || teacher.name || '',
    phone: getSingleSearchParam(searchParams?.phone) || teacher.phone || '',
    birth_date: getSingleSearchParam(searchParams?.birth_date) || (teacher.birthDate ? formatDateToKoreanYmd(teacher.birthDate) : ''),
    grade: getSingleSearchParam(searchParams?.grade) || teacher.grade || '',
    is_active: isActiveParamValue ? isActiveParamValue === 'on' : teacher.isActive,
  };
}

/**
 * 교사 수정 폼 입력값을 쿼리스트링으로 직렬화한다.
 */
function serializeFormValuesToQueryString(formValues: TeacherEditFormValues): string {
  const searchParams = new URLSearchParams();

  if (formValues.name) {
    searchParams.set('name', formValues.name);
  }

  if (formValues.phone) {
    searchParams.set('phone', formValues.phone);
  }

  if (formValues.birth_date) {
    searchParams.set('birth_date', formValues.birth_date);
  }

  if (formValues.grade) {
    searchParams.set('grade', formValues.grade);
  }

  if (formValues.is_active) {
    searchParams.set('is_active', 'on');
  }

  return searchParams.toString();
}

/**
 * 교사 정보 수정 페이지를 렌더링한다.
 */
export default async function TeacherEditPage({ params, searchParams }: TeacherEditPageProps) {
  const session = await getServerSession(authOptions);
  const { teacher_id: teacherId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
  const initialFormValues = buildFormValues(resolvedSearchParams, teacher);

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

    const rawFormValues: TeacherEditFormValues = {
      name: typeof formData.get('name') === 'string' ? (formData.get('name') as string) : '',
      phone: typeof formData.get('phone') === 'string' ? (formData.get('phone') as string) : '',
      birth_date: typeof formData.get('birth_date') === 'string' ? (formData.get('birth_date') as string) : '',
      grade: typeof formData.get('grade') === 'string' ? (formData.get('grade') as string) : '',
      is_active: isAdminForAction ? formData.get('is_active') === 'on' : initialTeacherIsActive,
    };
    const serializedFormValues = serializeFormValuesToQueryString(rawFormValues);

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

      redirect(`/teachers/${teacherId}/edit?${errorQueryString}${serializedFormValues ? `&${serializedFormValues}` : ''}`);
    }

    const teacherInput = parsedResult.data;
    const birthDate = teacherInput.birth_date ? new Date(`${teacherInput.birth_date}T00:00:00`) : null;

    if (birthDate && Number.isNaN(birthDate.getTime())) {
      redirect(`/teachers/${teacherId}/edit?error_code=invalid_birth_date${serializedFormValues ? `&${serializedFormValues}` : ''}`);
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
      redirect(`/teachers/${teacherId}/edit?error_code=server_error${serializedFormValues ? `&${serializedFormValues}` : ''}`);
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
            className="btn btn-secondary btn-md"
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
                defaultValue={initialFormValues.name}
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
                defaultValue={initialFormValues.phone}
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
                defaultValue={initialFormValues.birth_date}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">담당 학년</span>
              <select
                name="grade"
                defaultValue={initialFormValues.grade}
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
                defaultChecked={initialFormValues.is_active}
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
              className="btn btn-primary btn-md"
            >
              수정
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
