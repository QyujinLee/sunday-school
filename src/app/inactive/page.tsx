import type { Metadata } from 'next';

import StatusCard from '@/components/common/StatusCard';

export const metadata: Metadata = {
  title: '비활성 계정',
};

/**
 * 비활성 처리된 교사 계정 안내 페이지를 렌더링한다.
 */
export default function InactivePage() {
  return (
    <StatusCard
      title="비활성 처리된 계정입니다"
      description={`관리자가 계정을 비활성 상태로 변경했습니다. \n다시 이용하려면 관리자에게 문의해 주세요.`}
    />
  );
}
