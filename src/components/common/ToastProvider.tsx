'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export type ToastVariant = 'info' | 'success' | 'error';

type ToastInput = {
  message: string;
  description?: string;
  durationMs?: number;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  showToast: (toastInput: ToastInput) => void;
  dismissToast: (toastId: string) => void;
  clearToasts: () => void;
};

type ToastProviderProps = {
  children: ReactNode;
};

const DEFAULT_TOAST_DURATION_MS = 2800;
const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 토스트 변형 종류에 따라 스타일 클래스를 반환한다.
 */
function getToastVariantClass(variant: ToastVariant): string {
  if (variant === 'error') {
    return 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]';
  }

  if (variant === 'success') {
    return 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]';
  }

  return 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]';
}

/**
 * 전역 토스트 컨텍스트를 제공하고 포털로 토스트 목록을 렌더링한다.
 */
export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const canUsePortal = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  /**
   * 특정 토스트를 제거하고 관련 타이머를 정리한다.
   */
  const dismissToast = useCallback((toastId: string) => {
    const timeoutId = timeoutMapRef.current.get(toastId);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutMapRef.current.delete(toastId);
    }

    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== toastId));
  }, []);

  /**
   * 현재 표시 중인 모든 토스트를 즉시 제거한다.
   */
  const clearToasts = useCallback(() => {
    timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutMapRef.current.clear();
    setToasts([]);
  }, []);

  /**
   * 새 토스트를 하단에 추가하고 자동 제거 타이머를 등록한다.
   */
  const showToast = useCallback((toastInput: ToastInput) => {
    const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolvedDurationMs = toastInput.durationMs ?? DEFAULT_TOAST_DURATION_MS;
    const nextToast: ToastItem = {
      id: toastId,
      message: toastInput.message,
      description: toastInput.description,
      durationMs: resolvedDurationMs,
      variant: toastInput.variant ?? 'info',
    };

    setToasts((prevToasts) => [...prevToasts, nextToast]);

    const timeoutId = setTimeout(() => {
      dismissToast(toastId);
    }, resolvedDurationMs);

    timeoutMapRef.current.set(toastId, timeoutId);
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      showToast,
      dismissToast,
      clearToasts,
    }),
    [clearToasts, dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {canUsePortal
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:mr-0">
                {toasts.map((toast) => (
                  <div
                    key={toast.id}
                    className={`toast-enter pointer-events-auto rounded-xl border px-3 py-2 shadow-md ${getToastVariantClass(toast.variant ?? 'info')}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{toast.message}</p>
                        {toast.description ? <p className="mt-1 text-xs text-[var(--color-muted)]">{toast.description}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => dismissToast(toast.id)}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        aria-label="토스트 닫기"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

/**
 * 전역 토스트 API를 반환한다.
 */
export function useToast(): ToastContextValue {
  const toastContext = useContext(ToastContext);

  if (!toastContext) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다.');
  }

  return toastContext;
}
