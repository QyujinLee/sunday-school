'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * 밀리초 값을 `HH:MM:SS` 형식으로 변환한다.
 */
function formatMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * `HH:MM:SS` 입력 문자열을 밀리초로 변환한다.
 */
function parseTimeInputToMilliseconds(inputValue: string): number | null {
  const matched = inputValue.trim().match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (!matched) {
    return null;
  }

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  const seconds = Number(matched[3]);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * 타이머 페이지를 렌더링한다.
 */
export default function TimerPage() {
  const [inputTimeValue, setInputTimeValue] = useState<string>('');
  const [remainingMilliseconds, setRemainingMilliseconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 타이머를 시작한다.
   */
  function handleStartTimer() {
    if (isRunning) {
      return;
    }

    const parsedMilliseconds = parseTimeInputToMilliseconds(inputTimeValue);
    if (!parsedMilliseconds || parsedMilliseconds <= 0) {
      setValidationMessage('`HH:MM:SS` 형식으로 올바른 시간을 입력해 주세요.');
      return;
    }

    setValidationMessage('');
    setRemainingMilliseconds(parsedMilliseconds);
    setIsRunning(true);
  }

  /**
   * 타이머를 초기화한다.
   */
  function handleResetTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRunning(false);
    setRemainingMilliseconds(0);
    setInputTimeValue('');
    setValidationMessage('');
  }

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingMilliseconds((previousMilliseconds) => {
        if (previousMilliseconds <= 1000) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsRunning(false);
          return 0;
        }
        return previousMilliseconds - 1000;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  /**
   * 입력값 변경을 처리한다.
   */
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputTimeValue(event.target.value);
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">타이머</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">입력 형식: `HH:MM:SS` (예: `00:03:30`)</p>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="레크레이션 도구 이동">
          <Link href="/recreation" prefetch={false} className="btn btn-secondary btn-sm">
            레크레이션 홈
          </Link>
          <Link href="/recreation/number-baseball" prefetch={false} className="btn btn-secondary btn-sm">
            숫자야구
          </Link>
          <Link href="/recreation/timer" prefetch={false} className="btn btn-primary btn-sm">
            타이머
          </Link>
        </nav>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-8 text-center">
          <p className="text-4xl font-bold tracking-wider text-[var(--color-text)] sm:text-6xl">
            {formatMilliseconds(remainingMilliseconds)}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <input
            type="text"
            value={inputTimeValue}
            onChange={handleInputChange}
            placeholder="00:00:00"
            inputMode="numeric"
            className="w-full max-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            aria-label="타이머 시간 입력"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleStartTimer} disabled={isRunning} className="btn btn-primary btn-md">
              시작
            </button>
            <button type="button" onClick={handleResetTimer} className="btn btn-secondary btn-md">
              초기화
            </button>
          </div>
        </div>

        {validationMessage ? (
          <p className="mt-3 text-center text-sm font-medium text-[var(--color-danger)]">{validationMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
