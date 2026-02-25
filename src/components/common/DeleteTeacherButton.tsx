'use client';

import { useMemo, useState } from 'react';

import ActionModal, { type ActionModalButton } from '@/components/common/ActionModal';

type DeleteTeacherButtonProps = {
  deleteFormId: string;
  disabled?: boolean;
};

/**
 * 교사 계정 삭제 확인 모달과 삭제 버튼을 렌더링한다.
 */
export default function DeleteTeacherButton({ deleteFormId, disabled = false }: DeleteTeacherButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * 삭제 확인 모달을 연다.
   */
  function handleOpenModal() {
    if (disabled) {
      return;
    }

    setIsModalOpen(true);
  }

  /**
   * 삭제 확인 모달을 닫는다.
   */
  function handleCloseModal() {
    setIsModalOpen(false);
  }

  const modalButtons = useMemo<ActionModalButton[]>(
    () => [
      {
        label: '취소',
        tone: 'neutral',
        variant: 'outline',
        autoClose: true,
      },
      {
        label: '삭제',
        type: 'submit',
        form: deleteFormId,
        tone: 'danger',
        variant: 'solid',
      },
    ],
    [deleteFormId],
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpenModal}
        className="btn btn-danger btn-sm h-8"
      >
        삭제
      </button>

      <ActionModal
        isOpen={isModalOpen}
        title="계정 삭제"
        message="정말 삭제하시겠습니까?"
        buttons={modalButtons}
        onClose={handleCloseModal}
      />
    </>
  );
}
