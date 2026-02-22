'use client';

import { useState } from 'react';

type DeleteStudentButtonProps = {
  deleteFormId: string;
};

/**
 * 학생 삭제 확인 모달과 삭제 버튼을 렌더링한다.
 */
export default function DeleteStudentButton({ deleteFormId }: DeleteStudentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * 삭제 확인 모달을 연다.
   */
  function handleOpenModal() {
    setIsModalOpen(true);
  }

  /**
   * 삭제 확인 모달을 닫는다.
   */
  function handleCloseModal() {
    setIsModalOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        className="inline-flex items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2"
      >
        삭제
      </button>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgb(var(--color-dim-rgb)/0.7)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-student-modal-title"
          aria-describedby="delete-student-modal-description"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg">
            <h2 id="delete-student-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
              학생 삭제
            </h2>
            <p id="delete-student-modal-description" className="mt-2 text-sm text-[var(--color-muted)]">
              정말 삭제하시겠습니까?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              >
                취소
              </button>
              <button
                type="submit"
                form={deleteFormId}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
