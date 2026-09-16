import type { Metadata } from 'next';

import Link from 'next/link';

import StatusCard from '@/components/common/StatusCard';
import { getButtonClassName } from '@/lib/button';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
};

/**
 * 존재하지 않는 경로로 접근했을 때 안내 화면을 렌더링한다.
 */
export default function NotFoundPage() {
  return (
    <StatusCard
      title="페이지를 찾을 수 없습니다"
      description={'주소가 바뀌었거나 삭제된 페이지입니다.\n홈에서 다시 시작해 주세요.'}
      action={
        <Link href="/" prefetch={false} className={getButtonClassName({ variant: 'primary', fullWidth: true })}>
          홈으로
        </Link>
      }
    />
  );
}
