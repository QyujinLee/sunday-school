'use client';

type ModalButtonTone = 'neutral' | 'primary' | 'danger';
type ModalButtonVariant = 'outline' | 'solid';

export type ActionModalButton = {
  label: string;
  type?: 'button' | 'submit';
  form?: string;
  tone?: ModalButtonTone;
  variant?: ModalButtonVariant;
  disabled?: boolean;
  autoClose?: boolean;
  onClick?: () => void;
};

type ActionModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  buttons: ActionModalButton[];
  onClose: () => void;
};

/**
 * 메시지와 액션 버튼 구성을 전달받아 공통 확인 모달을 렌더링한다.
 */
export default function ActionModal({ isOpen, title, message, buttons, onClose }: ActionModalProps) {
  /**
   * 버튼 클릭 이후 필요한 콜백과 모달 닫기 동작을 처리한다.
   */
  function handleButtonClick(button: ActionModalButton) {
    button.onClick?.();

    if (button.autoClose) {
      onClose();
    }
  }

  /**
   * 버튼 톤/변형에 따른 클래스 조합을 반환한다.
   */
  function getButtonClassName(button: ActionModalButton): string {
    const tone = button.tone ?? 'neutral';
    const variant = button.variant ?? 'outline';

    if (tone === 'danger' && variant === 'solid') {
      return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2 disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)]';
    }

    if (tone === 'danger' && variant === 'outline') {
      return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-offset-2 disabled:border-[var(--color-border)] disabled:text-[var(--color-muted)]';
    }

    if (tone === 'primary' && variant === 'solid') {
      return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-surface)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)]';
    }

    return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:border-[var(--color-border)] disabled:text-[var(--color-muted)]';
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgb(var(--color-dim-rgb)/0.7)] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby="action-modal-description"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg">
        <h2 id="action-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
          {title}
        </h2>
        <p id="action-modal-description" className="mt-2 text-sm text-[var(--color-muted)]">
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          {buttons.map((button, index) => (
            <button
              key={`${button.label}-${index}`}
              type={button.type ?? 'button'}
              form={button.form}
              disabled={button.disabled}
              onClick={() => handleButtonClick(button)}
              className={getButtonClassName(button)}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
