import ApprovalStatusCard from '@/components/common/ApprovalStatusCard';

/**
 * 승인 대기 안내 페이지를 렌더링한다.
 */
export default function PendingPage() {
  return (
    <ApprovalStatusCard
      title="승인 대기 중입니다"
      description={`관리자 승인 후 서비스를 이용할 수 있습니다. \n승인이 완료될 때까지 잠시만 기다려 주세요.`}
    />
  );
}
