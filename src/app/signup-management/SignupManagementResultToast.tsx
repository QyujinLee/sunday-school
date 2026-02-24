'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/common/ToastProvider';

/**
 * 가입 관리 액션 결과 토스트를 표시한다.
 */
export default function SignupManagementResultToast() {
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

    if (successCode === 'signup_approved') {
      showToast({
        variant: 'success',
        message: '승인 처리가 완료되었습니다.',
      });
    } else if (successCode === 'signup_rejected') {
      showToast({
        variant: 'success',
        message: '거절 처리가 완료되었습니다.',
      });
    } else if (successCode === 'role_updated') {
      showToast({
        variant: 'success',
        message: '권한 변경이 완료되었습니다.',
      });
    } else if (successCode === 'teacher_deleted') {
      showToast({
        variant: 'success',
        message: '계정 삭제가 완료되었습니다.',
      });
    }

    if (errorCode === 'forbidden') {
      showToast({
        variant: 'error',
        message: '작업에 실패했습니다.',
        description: '권한이 없습니다.',
      });
    } else if (errorCode === 'invalid_request') {
      showToast({
        variant: 'error',
        message: '작업에 실패했습니다.',
        description: '요청 값이 올바르지 않습니다.',
      });
    } else if (errorCode === 'self_protected') {
      showToast({
        variant: 'error',
        message: '작업에 실패했습니다.',
        description: '본인 관리자 계정은 변경하거나 삭제할 수 없습니다.',
      });
    } else if (errorCode === 'server_error') {
      showToast({
        variant: 'error',
        message: '서버 오류로 작업에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
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
