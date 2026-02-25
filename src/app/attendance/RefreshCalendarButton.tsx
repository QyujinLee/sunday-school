'use client';

import { faRotateRight, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormStatus } from 'react-dom';

/**
 * 금주 예배 일정 새로고침 제출 버튼을 렌더링한다.
 */
export default function RefreshCalendarButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn btn-secondary btn-sm"
    >
      <FontAwesomeIcon icon={pending ? faSpinner : faRotateRight} className={pending ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
      {pending ? '새로고침 중...' : '새로고침'}
    </button>
  );
}
