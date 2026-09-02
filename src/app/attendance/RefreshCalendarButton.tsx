'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { faRotateRight, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useToast } from '@/components/common/ToastProvider';

/**
 * 금주 예배 일정 새로고침 버튼을 렌더링한다.
 */
export default function RefreshCalendarButton() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * 주간 일정 캐시를 무효화하고 화면을 갱신한다.
   */
  async function handleRefreshCalendar() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch('/api/dashboard/refresh-calendar', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('refresh_failed');
      }

      router.refresh();
    } catch {
      showToast({
        variant: 'error',
        message: '주간 일정을 새로고침하지 못했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefreshCalendar}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      className="btn btn-secondary btn-sm"
    >
      <FontAwesomeIcon
        icon={isRefreshing ? faSpinner : faRotateRight}
        className={isRefreshing ? 'h-3 w-3 animate-spin' : 'h-3 w-3'}
      />
      {isRefreshing ? '새로고침 중...' : '새로고침'}
    </button>
  );
}
