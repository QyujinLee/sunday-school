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

    if (!successCode) {
      return;
    }

    if (successCode === 'student_deleted') {
      showToast({
        variant: 'success',
        message: '학생이 삭제되었습니다.',
      });
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete('success_code');
    const nextQueryString = nextSearchParams.toString();
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, showToast]);

  return null;
}

