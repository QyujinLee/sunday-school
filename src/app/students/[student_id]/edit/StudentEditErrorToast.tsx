'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/common/ToastProvider';

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

/**
 * 쿼리스트링의 필드 키 목록을 한글 라벨 목록으로 변환한다.
 */
function getFieldLabelsFromQuery(errorFields: string | null): string[] {
  if (!errorFields) {
    return [];
  }

  return errorFields
    .split(',')
    .map((fieldKey) => fieldKey.trim())
    .filter(Boolean)
    .map((fieldKey) => FIELD_LABEL_BY_KEY[fieldKey])
    .filter(Boolean);
}

/**
 * 학생 수정/삭제 결과 쿼리스트링을 감지해 토스트를 표시한다.
 */
export default function StudentEditErrorToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    const successCode = searchParams.get('success_code');
    const errorCode = searchParams.get('error');

    if (!successCode && !errorCode) {
      return;
    }

    if (successCode === 'student_updated') {
      showToast({
        variant: 'success',
        message: '학생 정보가 수정되었습니다.',
      });

      const timeoutId = window.setTimeout(() => {
        router.replace('/students');
      }, 400);

      return () => window.clearTimeout(timeoutId);
    }

    if (errorCode === 'invalid_birth_date') {
      showToast({
        variant: 'error',
        message: '생년월일 형식이 올바르지 않습니다.',
        description: '날짜를 다시 선택해 주세요.',
      });
    } else if (errorCode === 'invalid_input') {
      const fieldLabels = getFieldLabelsFromQuery(searchParams.get('error_fields'));
      const description =
        fieldLabels.length > 0
          ? `다음 항목을 확인해 주세요: ${fieldLabels.join(', ')}`
          : '입력한 값을 다시 확인해 주세요.';

      showToast({
        variant: 'error',
        message: '학생 수정에 실패했습니다.',
        description,
      });
    } else if (errorCode === 'delete_failed') {
      showToast({
        variant: 'error',
        message: '학생 삭제에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } else if (errorCode === 'update_failed') {
      showToast({
        variant: 'error',
        message: '학생 수정에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } else {
      showToast({
        variant: 'error',
        message: '입력값을 확인해 주세요.',
      });
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete('error');
    nextSearchParams.delete('error_fields');
    nextSearchParams.delete('success_code');
    const nextQueryString = nextSearchParams.toString();
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, showToast]);

  return null;
}

