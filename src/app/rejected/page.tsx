import ApprovalStatusCard from '@/components/common/ApprovalStatusCard';

/**
 * 가입 거절 안내 페이지를 렌더링한다.
 */
export default function RejectedPage() {
  return (
    <ApprovalStatusCard
      title="가입이 거절되었습니다"
      description="관리자가 가입 요청을 거절했습니다. 문의가 필요하면 관리자에게 직접 연락해 주세요."
    />
  );
}
