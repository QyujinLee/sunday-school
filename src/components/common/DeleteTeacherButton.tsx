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
        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-danger)] shadow-sm transition-colors hover:bg-[var(--color-danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2 disabled:border-[var(--color-border)] disabled:text-[var(--color-muted)] disabled:shadow-none"
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
