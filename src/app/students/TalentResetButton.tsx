'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ActionModal, { type ActionModalButton } from '@/components/common/ActionModal';
import { useToast } from '@/components/common/ToastProvider';

/**
 * 관리자 전용 달란트 전체 초기화 버튼을 렌더링한다.
 */
export default function TalentResetButton() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 확인 모달을 연다.
   */
  function handleOpenModal() {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(true);
  }

  /**
   * 확인 모달을 닫는다.
   */
  function handleCloseModal() {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
  }

  /**
   * 전체 달란트와 달란트 변동 기록을 초기화한다.
   */
  async function handleResetTalents() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/students/talent-reset', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('request_failed');
      }

      showToast({
        variant: 'success',
        message: '전체 달란트가 초기화되었습니다.',
      });
      setIsModalOpen(false);
      router.refresh();
    } catch {
      showToast({
        variant: 'error',
        message: '달란트 초기화에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const modalButtons = useMemo<ActionModalButton[]>(
    () => [
      {
        label: '취소',
        tone: 'neutral',
        variant: 'outline',
        autoClose: true,
        disabled: isSubmitting,
      },
      {
        label: isSubmitting ? '초기화 중...' : '전체 초기화',
        tone: 'danger',
        variant: 'solid',
        disabled: isSubmitting,
        onClick: handleResetTalents,
      },
    ],
    [isSubmitting],
  );

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={isSubmitting}
        className="btn btn-danger btn-md"
      >
        달란트 초기화
      </button>

      <ActionModal
        isOpen={isModalOpen}
        title="달란트 전체 초기화"
        message={`정말 전체 학생의 달란트를 초기화하시겠습니까?\n달란트 변동 기록도 모두 삭제됩니다.`}
        buttons={modalButtons}
        onClose={handleCloseModal}
      />
    </>
  );
}
