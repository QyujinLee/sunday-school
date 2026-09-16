import type { Metadata } from 'next';

import StatusCard from '@/components/common/StatusCard';

export const metadata: Metadata = {
  title: '가입 거절',
};

/**
 * 가입 거절 안내 페이지를 렌더링한다.
 */
export default function RejectedPage() {
  return (
    <StatusCard
      title="가입이 거절되었습니다"
      description="관리자가 가입 요청을 거절했습니다. 문의가 필요하면 관리자에게 직접 연락해 주세요."
    />
  );
}
