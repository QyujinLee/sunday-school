'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/common/ToastProvider';

const FIELD_LABEL_BY_KEY: Record<string, string> = {
  name: '이름',
  phone: '연락처',
  birth_date: '생년월일',
  grade: '담당 학년',
  is_active: '활성 상태',
};

/**
 * 쿼리스트링의 필드 키 목록을 사용자 표시용 라벨 배열로 변환한다.
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
 * 교사 정보 수정 결과 토스트를 표시한다.
 */
export default function TeacherEditResultToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    const errorCode = searchParams.get('error_code') ?? searchParams.get('error');

    if (!errorCode) {
      return;
    }

    if (errorCode === 'invalid_birth_date') {
      showToast({
        variant: 'error',
        message: '교사 정보 수정에 실패했습니다.',
        description: '생년월일 형식이 올바르지 않습니다.',
      });
    } else if (errorCode === 'invalid_input') {
      const fieldLabels = getFieldLabelsFromQuery(searchParams.get('error_fields'));
      const description =
        fieldLabels.length > 0
          ? `다음 항목을 확인해 주세요: ${fieldLabels.join(', ')}`
          : '입력한 값을 다시 확인해 주세요.';

      showToast({
        variant: 'error',
        message: '교사 정보 수정에 실패했습니다.',
        description,
      });
    } else if (errorCode === 'forbidden') {
      showToast({
        variant: 'error',
        message: '작업에 실패했습니다.',
        description: '수정 권한이 없습니다.',
      });
    } else if (errorCode === 'server_error') {
      showToast({
        variant: 'error',
        message: '서버 오류로 교사 정보 수정에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } else {
      showToast({
        variant: 'error',
        message: '교사 정보 수정에 실패했습니다.',
      });
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete('error');
    nextSearchParams.delete('error_code');
    nextSearchParams.delete('error_fields');
    const nextQueryString = nextSearchParams.toString();
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, showToast]);

  return null;
}
