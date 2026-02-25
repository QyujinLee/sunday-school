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
   * 버튼 클릭 콜백을 실행하고 필요하면 모달을 닫는다.
   */
  function handleButtonClick(button: ActionModalButton) {
    button.onClick?.();

    if (button.autoClose) {
      onClose();
    }
  }

  /**
   * 버튼 옵션에 따른 스타일 클래스를 반환한다.
   */
  function getButtonClassName(button: ActionModalButton): string {
    const tone = button.tone ?? 'neutral';
    const variant = button.variant ?? 'outline';

    if (tone === 'danger' && variant === 'solid') {
      return 'btn btn-danger btn-md';
    }

    if (tone === 'danger' && variant === 'outline') {
      return 'btn btn-danger btn-md';
    }

    if (tone === 'primary' && variant === 'solid') {
      return 'btn btn-primary btn-md';
    }

    return 'btn btn-secondary btn-md';
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
        <p id="action-modal-description" className="mt-2 whitespace-pre-line text-sm text-[var(--color-muted)]">
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
