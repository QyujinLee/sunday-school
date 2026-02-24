'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type CollapsiblePanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * 반응형 기본 상태(모바일 접힘, PC 펼침)를 가지는 접이식 패널을 렌더링한다.
 */
export default function CollapsiblePanel({
  title,
  description,
  children,
  className,
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');

    /**
     * 화면 너비 기준으로 패널 펼침 상태를 동기화한다.
     */
    function handleSyncExpandedByViewport() {
      setIsExpanded(mediaQuery.matches);
    }

    handleSyncExpandedByViewport();
    mediaQuery.addEventListener('change', handleSyncExpandedByViewport);

    return () => {
      mediaQuery.removeEventListener('change', handleSyncExpandedByViewport);
    };
  }, []);

  /**
   * 패널 펼침/접힘 상태를 토글한다.
   */
  function handleToggleExpanded() {
    setIsExpanded((previous) => !previous);
  }

  return (
    <section
      className={`mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 ${
        className ?? ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
        <button
          type="button"
          onClick={handleToggleExpanded}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `${title} 접기` : `${title} 펼치기`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-[var(--color-text)] transition hover:bg-[var(--color-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-4 w-4" />
        </button>
      </div>

      {description ? <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p> : null}

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
          isExpanded ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
