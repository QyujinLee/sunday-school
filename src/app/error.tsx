'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import StatusCard from '@/components/common/StatusCard';
import { getButtonClassName } from '@/lib/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 렌더링 중 발생한 오류를 안내하고 다시 시도할 수 있는 화면을 렌더링한다.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 오류가 발생한 구간을 다시 렌더링한다.
   */
  const handleRetry = () => {
    reset();
  };

  const description = [
    '잠시 후 다시 시도해 주세요.',
    '같은 화면이 계속 나오면 관리자에게 알려 주세요.',
    error.digest ? `오류 코드: ${error.digest}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <StatusCard
      title="문제가 발생했습니다"
      description={description}
      action={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className={getButtonClassName({ variant: 'primary', fullWidth: true })}
          >
            다시 시도
          </button>
          <Link href="/" prefetch={false} className={getButtonClassName({ variant: 'secondary', fullWidth: true })}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
