import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Gender, Relationship } from '@prisma/client';
import { z } from 'zod';

import RestrictedInput from '@/components/common/RestrictedInput';
import { prisma } from '@/lib/prisma';
import { formatDateToKoreanYmd } from '@/utils/date';
import DeleteStudentButton from './DeleteStudentButton';
import StudentEditErrorToast from './StudentEditErrorToast';

const PHONE_NUMBER_REGEX = /^010-\d{4}-\d{4}$/;
const FIELD_LABEL_BY_KEY: Record<string, string> = {
  name: '이름',
  gender: '성별',
  birth_date: '생년월일',
  address: '주소',
  phone: '전화번호',
  guardian_name: '보호자 성함/관계/전화번호',
  guardian_relationship: '보호자 관계',
  guardian_phone: '보호자 전화번호',
};

type StudentEditPageProps = {
  params: Promise<{
    student_id: string;
  }>;
};

const studentUpdateSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요.'),
    gender: z
      .string()
      .refine((value) => Object.values(Gender).includes(value as Gender), '성별을 선택해 주세요.')
      .transform((value) => value as Gender),
    birth_date: z.string().trim().min(1, '생년월일을 입력해 주세요.'),
    address: z.string().trim().min(1, '주소를 입력해 주세요.'),
    phone: z
      .string()
      .trim()
      .refine((value) => !value || PHONE_NUMBER_REGEX.test(value), '전화번호는 010-0000-0000 형식으로 입력해 주세요.')
      .optional(),
    guardian_name: z.string().trim().optional(),
    guardian_relationship: z.preprocess((value) => {
      if (typeof value !== 'string') {
        return undefined;
      }

      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue;
    }, z.nativeEnum(Relationship).optional()),
    guardian_phone: z
      .string()
      .trim()
      .refine((value) => !value || PHONE_NUMBER_REGEX.test(value), '보호자 전화번호는 010-0000-0000 형식으로 입력해 주세요.')
      .optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyGuardianField = Boolean(value.guardian_name || value.guardian_relationship || value.guardian_phone);
    const hasAllGuardianFields = Boolean(value.guardian_name && value.guardian_relationship && value.guardian_phone);

    if (hasAnyGuardianField && !hasAllGuardianFields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guardian_name'],
        message: '보호자 정보는 이름/관계/전화번호를 모두 입력해 주세요.',
      });
    }
  });

interface FieldLabelProps {
  label: string;
  required?: boolean;
  showOptional?: boolean;
}

/**
 * 폼 필드 라벨을 렌더링한다.
 */
function FieldLabel({ label, required = false, showOptional = false }: FieldLabelProps) {
  return (
    <span className="text-sm font-medium text-[var(--color-text)]">
      {label}
      {required ? <span className="ml-1 text-[var(--color-primary)]">*</span> : showOptional ? <span className="ml-1 text-xs text-[var(--color-muted)]">(선택)</span> : null}
    </span>
  );
}

/**
 * 문자열 입력값을 공백 제거한 텍스트로 정리한다.
 */
function normalizeTextValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 전화번호 입력값을 숫자 기준으로 010-0000-0000 형식으로 변환한다.
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
 * 검증 실패 필드 키 목록을 쿼리스트링으로 직렬화한다.
 */
function serializeInvalidFields(fieldKeys: string[]): string {
  const uniqueKeys = Array.from(new Set(fieldKeys)).filter((fieldKey) => FIELD_LABEL_BY_KEY[fieldKey]);
  return uniqueKeys.join(',');
}

/**
 * 학생 수정 페이지를 렌더링한다.
 */
export default async function StudentEditPage({ params }: StudentEditPageProps) {
  const { student_id: studentId } = await params;
  const deleteFormId = `student-delete-form-${studentId}`;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      guardianContact: true,
    },
  });

  if (!student) {
    redirect('/students');
  }

  /**
   * 학생/보호자 정보를 수정하고 목록 페이지로 이동한다.
   */
  async function handleUpdateStudent(formData: FormData) {
    'use server';

    const parsedResult = studentUpdateSchema.safeParse({
      name: normalizeTextValue(formData.get('name')),
      gender: normalizeTextValue(formData.get('gender')),
      birth_date: normalizeTextValue(formData.get('birth_date')),
      address: normalizeTextValue(formData.get('address')),
      phone: normalizePhoneValue(formData.get('phone')),
      guardian_name: normalizeTextValue(formData.get('guardian_name')),
      guardian_relationship: normalizeTextValue(formData.get('guardian_relationship')),
      guardian_phone: normalizePhoneValue(formData.get('guardian_phone')),
    });

    if (!parsedResult.success) {
      const invalidFieldKeys = parsedResult.error.issues
        .map((issue) => String(issue.path[0] ?? ''))
        .filter(Boolean);
      const serializedInvalidFields = serializeInvalidFields(invalidFieldKeys);
      const errorQueryString = serializedInvalidFields
        ? `error=invalid_input&error_fields=${encodeURIComponent(serializedInvalidFields)}`
        : 'error=invalid_input';

      redirect(`/students/${studentId}/edit?${errorQueryString}`);
    }

    const studentInput = parsedResult.data;
    const birthDate = new Date(`${studentInput.birth_date}T00:00:00`);
    const hasGuardianContact = Boolean(
      studentInput.guardian_name && studentInput.guardian_relationship && studentInput.guardian_phone
    );

    if (Number.isNaN(birthDate.getTime())) {
      redirect(`/students/${studentId}/edit?error=invalid_birth_date`);
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: studentId },
          data: {
            name: studentInput.name.trim(),
            gender: studentInput.gender,
            birthDate,
            address: studentInput.address.trim(),
            phone: studentInput.phone?.trim() || null,
          },
        });

        if (hasGuardianContact) {
          await tx.guardianContact.upsert({
            where: { studentId },
            update: {
              name: studentInput.guardian_name!.trim(),
              relationship: studentInput.guardian_relationship!,
              phone: studentInput.guardian_phone!.trim(),
            },
            create: {
              studentId,
              name: studentInput.guardian_name!.trim(),
              relationship: studentInput.guardian_relationship!,
              phone: studentInput.guardian_phone!.trim(),
            },
          });
        } else {
          await tx.guardianContact.deleteMany({
            where: { studentId },
          });
        }
      });
    } catch {
      redirect(`/students/${studentId}/edit?error=update_failed`);
    }

    redirect(`/students/${studentId}/edit?success_code=student_updated`);
  }

  /**
   * 현재 학생을 삭제하고 목록 페이지로 이동한다.
   */
  async function handleDeleteStudent() {
    'use server';

    try {
      await prisma.student.delete({
        where: { id: studentId },
      });
    } catch {
      redirect(`/students/${studentId}/edit?error=delete_failed`);
    }

    redirect('/students?success_code=student_deleted');
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <StudentEditErrorToast />
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">학생 수정</h1>
          <Link
            href="/students"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            목록으로
          </Link>
        </div>

        <form action={handleUpdateStudent} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <FieldLabel label="이름" required />
              <input
                name="name"
                type="text"
                required
                defaultValue={student.name}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel label="성별" required />
              <select
                name="gender"
                required
                defaultValue={student.gender}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              >
                <option value={Gender.MALE}>남</option>
                <option value={Gender.FEMALE}>여</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <FieldLabel label="생년월일" required />
              <input
                name="birth_date"
                type="date"
                required
                defaultValue={formatDateToKoreanYmd(student.birthDate)}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 sm:col-span-2">
              <FieldLabel label="주소 (시, 구, 동까지만 입력)" required />
              <input
                name="address"
                type="text"
                required
                defaultValue={student.address}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel label="전화번호" showOptional />
              <RestrictedInput
                filterType="phone"
                name="phone"
                type="text"
                inputMode="numeric"
                defaultValue={student.phone ?? ''}
                placeholder="010-0000-0000"
                maxLength={13}
                pattern="010-[0-9]{4}-[0-9]{4}"
                title="010-0000-0000 형식으로 입력해 주세요."
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <FieldLabel label="보호자 성함" />
              <input
                name="guardian_name"
                type="text"
                defaultValue={student.guardianContact?.name ?? ''}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel label="관계" />
              <select
                name="guardian_relationship"
                defaultValue={student.guardianContact?.relationship ?? ''}
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              >
                <option value="" disabled>
                  선택
                </option>
                <option value={Relationship.FATHER}>부</option>
                <option value={Relationship.MOTHER}>모</option>
                <option value={Relationship.GRANDFATHER}>조부</option>
                <option value={Relationship.GRANDMOTHER}>조모</option>
                <option value={Relationship.ETC}>기타</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <FieldLabel label="보호자 전화번호" />
              <RestrictedInput
                filterType="phone"
                name="guardian_phone"
                type="text"
                inputMode="numeric"
                defaultValue={student.guardianContact?.phone ?? ''}
                placeholder="010-0000-0000"
                maxLength={13}
                pattern="010-[0-9]{4}-[0-9]{4}"
                title="010-0000-0000 형식으로 입력해 주세요."
                className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              수정
            </button>
            <DeleteStudentButton deleteFormId={deleteFormId} />
          </div>
        </form>
        <form id={deleteFormId} action={handleDeleteStudent} />
      </section>
    </main>
  );
}
