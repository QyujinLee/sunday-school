'use client';

import { useEffect } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/common/ToastProvider';

/**
 * 학생 관리 화면의 결과 토스트를 표시한다.
 */
export default function StudentsResultToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    const successCode = searchParams.get('success_code');
    const errorCode = searchParams.get('error_code');

    if (!successCode && !errorCode) {
      return;
    }

    if (successCode === 'student_deleted') {
      showToast({
        variant: 'success',
        message: '학생 삭제가 완료되었습니다.',
      });
    }

    if (errorCode === 'server_error') {
      showToast({
        variant: 'error',
        message: '서버 오류로 작업에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } else if (errorCode === 'invalid_request') {
      showToast({
        variant: 'error',
        message: '작업에 실패했습니다.',
        description: '요청 값이 올바르지 않습니다.',
      });
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete('success_code');
    nextSearchParams.delete('error_code');
    const nextQueryString = nextSearchParams.toString();
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, showToast]);

  return null;
}
