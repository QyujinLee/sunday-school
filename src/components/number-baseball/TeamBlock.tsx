'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import ActionModal, { type ActionModalButton } from '@/components/common/ActionModal';

type TeamColor = 'purple' | 'blue' | 'yellow' | 'red';
type TeamId = 'purple_bears' | 'blue_tigers' | 'yellow_eagles' | 'red_lions';

type TeamBlockProps = {
  teamId: TeamId;
  color: TeamColor;
  teamName: string;
  homerunRank: number | null;
  onHomerun: (teamId: TeamId) => void;
  onInitialize: (teamId: TeamId) => void;
  onSnapshotChange: (teamId: TeamId, guessHistories: GuessHistory[]) => void;
};

export type GuessHistory = {
  value: string;
  strike: number;
  ball: number;
  isOut: boolean;
};

const TEAM_STYLE_BY_COLOR: Record<
  TeamColor,
  {
    wrapperClassName: string;
    inputClassName: string;
    validateButtonClassName: string;
    initializeButtonClassName: string;
    answerButtonClassName: string;
    historyBoxClassName: string;
  }
> = {
  purple: {
    wrapperClassName: 'border-[#8b6bff] bg-[rgb(139_107_255/0.08)]',
    inputClassName: 'border-[#b8a3ff] focus:border-[#8b6bff]',
    validateButtonClassName:
      'border-[#8b6bff] bg-[rgb(139_107_255/0.18)] text-[#5230b8] hover:bg-[rgb(139_107_255/0.3)]',
    initializeButtonClassName: 'border-[#8b6bff] bg-[#8b6bff] text-white hover:bg-[#7658dc]',
    answerButtonClassName: 'border-[#8b6bff] bg-[var(--color-surface)] text-[#5230b8] hover:bg-[rgb(139_107_255/0.14)]',
    historyBoxClassName: 'bg-[rgb(139_107_255/0.12)]',
  },
  blue: {
    wrapperClassName: 'border-[var(--color-primary)] bg-[rgb(var(--color-primary-rgb)/0.1)]',
    inputClassName: 'border-[var(--color-border-strong)] focus:border-[var(--color-primary)]',
    validateButtonClassName:
      'border-[var(--color-primary)] bg-[rgb(var(--color-primary-rgb)/0.14)] text-[var(--color-primary)] hover:bg-[rgb(var(--color-primary-rgb)/0.22)]',
    initializeButtonClassName:
      'border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
    answerButtonClassName:
      'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] hover:bg-[rgb(var(--color-primary-rgb)/0.12)]',
    historyBoxClassName: 'bg-[rgb(var(--color-primary-rgb)/0.12)]',
  },
  yellow: {
    wrapperClassName: 'border-[#e7c25d] bg-[rgb(231_194_93/0.15)]',
    inputClassName: 'border-[#edd588] focus:border-[#d3a937]',
    validateButtonClassName:
      'border-[#d3a937] bg-[rgb(231_194_93/0.3)] text-[#8f6d17] hover:bg-[rgb(231_194_93/0.44)]',
    initializeButtonClassName: 'border-[#d3a937] bg-[#d3a937] text-white hover:bg-[#be962f]',
    answerButtonClassName: 'border-[#d3a937] bg-[var(--color-surface)] text-[#8f6d17] hover:bg-[rgb(231_194_93/0.2)]',
    historyBoxClassName: 'bg-[rgb(231_194_93/0.22)]',
  },
  red: {
    wrapperClassName: 'border-[#dd6f74] bg-[rgb(221_111_116/0.12)]',
    inputClassName: 'border-[#efb3b7] focus:border-[#dd6f74]',
    validateButtonClassName:
      'border-[#dd6f74] bg-[rgb(221_111_116/0.24)] text-[#a63e45] hover:bg-[rgb(221_111_116/0.34)]',
    initializeButtonClassName: 'border-[#dd6f74] bg-[#dd6f74] text-white hover:bg-[#c85b62]',
    answerButtonClassName: 'border-[#dd6f74] bg-[var(--color-surface)] text-[#a63e45] hover:bg-[rgb(221_111_116/0.16)]',
    historyBoxClassName: 'bg-[rgb(221_111_116/0.18)]',
  },
};

/**
 * 중복 없는 4자리 숫자를 생성한다.
 */
function generateUniqueFourDigitString(): string {
  const digits = Array.from({ length: 10 }, (_, index) => String(index));
  let result = '';

  for (let index = 0; index < 4; index += 1) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    result += digits[randomIndex];
    digits.splice(randomIndex, 1);
  }

  return result;
}

/**
 * 동일 숫자 포함 개수(볼 + 스트라이크)를 계산한다.
 */
function getIncludedDigitCount(answerValue: string, guessValue: string): number {
  const answerDigits = new Set(answerValue.split(''));
  const guessDigits = new Set(guessValue.split(''));

  let overlapCount = 0;
  answerDigits.forEach((digit) => {
    if (guessDigits.has(digit)) {
      overlapCount += 1;
    }
  });

  return overlapCount;
}

/**
 * 같은 자리 동일 숫자 개수(스트라이크)를 계산한다.
 */
function getStrikeCount(answerValue: string, guessValue: string): number {
  let strikeCount = 0;

  for (let index = 0; index < 4; index += 1) {
    if (answerValue[index] === guessValue[index]) {
      strikeCount += 1;
    }
  }

  return strikeCount;
}

/**
 * 입력값이 중복 없는 4자리 숫자인지 검증한다.
 */
function validateGuessValue(rawValue: string): { valid: true } | { valid: false; message: string } {
  if (!/^\d{4}$/.test(rawValue)) {
    return { valid: false, message: '4자리 숫자를 입력해 주세요.' };
  }

  if (new Set(rawValue.split('')).size !== 4) {
    return { valid: false, message: '중복되지 않는 숫자로 입력해 주세요.' };
  }

  return { valid: true };
}

/**
 * 숫자야구 팀 보드를 렌더링한다.
 */
export default function TeamBlock({
  teamId,
  color,
  teamName,
  homerunRank,
  onHomerun,
  onInitialize,
  onSnapshotChange,
}: TeamBlockProps) {
  const teamStyle = TEAM_STYLE_BY_COLOR[color];
  const inputRef = useRef<HTMLInputElement>(null);
  const [answerValue, setAnswerValue] = useState<string>('');
  const [guessHistories, setGuessHistories] = useState<GuessHistory[]>([]);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState<boolean>(false);

  const answerModalMessage = answerValue
    ? `${teamName}의 정답은 ${answerValue} 입니다.`
    : '아직 정답이 생성되지 않았습니다.\n먼저 초기화를 눌러 주세요.';

  const answerModalButtons = useMemo<ActionModalButton[]>(
    () => [
      {
        label: '확인',
        tone: 'primary',
        variant: 'solid',
        autoClose: true,
      },
    ],
    [],
  );

  useEffect(() => {
    onSnapshotChange(teamId, guessHistories);
  }, [guessHistories, onSnapshotChange, teamId]);

  /**
   * 게임을 초기화하고 새로운 정답을 생성한다.
   */
  function handleInitializeGame() {
    onInitialize(teamId);
    setAnswerValue(generateUniqueFourDigitString());
    setGuessHistories([]);
    setValidationMessage('');

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  /**
   * 정답 모달을 연다.
   */
  function handleOpenAnswerModal() {
    setIsAnswerModalOpen(true);
  }

  /**
   * 정답 모달을 닫는다.
   */
  function handleCloseAnswerModal() {
    setIsAnswerModalOpen(false);
  }

  /**
   * 입력값을 검증하고 결과를 기록한다.
   */
  function handleValidateGuess() {
    const inputElement = inputRef.current;
    if (!inputElement) {
      return;
    }

    if (!answerValue) {
      setValidationMessage('먼저 초기화를 눌러 정답을 생성해 주세요.');
      return;
    }

    const guessValue = inputElement.value.trim();
    const validationResult = validateGuessValue(guessValue);

    if (!validationResult.valid) {
      setValidationMessage(validationResult.message);
      return;
    }

    const includedDigitCount = getIncludedDigitCount(answerValue, guessValue);
    const strikeCount = getStrikeCount(answerValue, guessValue);
    const ballCount = includedDigitCount - strikeCount;
    const isHomerun = strikeCount === 4;

    if (isHomerun && !homerunRank) {
      onHomerun(teamId);
    }

    setGuessHistories((previousHistories) => [
      ...previousHistories,
      {
        value: guessValue,
        strike: strikeCount,
        ball: ballCount,
        isOut: includedDigitCount === 0,
      },
    ]);

    inputElement.value = '';
    setValidationMessage('');
    inputElement.focus();
  }

  /**
   * 엔터 입력 시 검증을 수행한다.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleValidateGuess();
    }
  }

  return (
    <>
      <article
        className={`rounded-2xl border-2 p-4 shadow-sm ${teamStyle.wrapperClassName}`}
        aria-label={`${teamName} 숫자야구 보드`}
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">{teamName}</h2>
            {homerunRank ? (
              <span className="inline-flex items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                {homerunRank}위
              </span>
            ) : null}
          </div>
          <span className="text-xs text-[var(--color-muted)]">
            {answerValue ? (homerunRank ? '홈런 달성' : '진행 중') : '대기 중'}
          </span>
        </header>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            type="text"
            maxLength={4}
            inputMode="numeric"
            placeholder="4자리 숫자"
            className={`w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none ${teamStyle.inputClassName}`}
            onKeyDown={handleKeyDown}
            aria-label={`${teamName} 숫자 입력`}
          />
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className={`btn btn-sm ${teamStyle.validateButtonClassName}`}
              onClick={handleValidateGuess}
            >
              검증
            </button>
            <button
              type="button"
              className={`btn btn-sm ${teamStyle.initializeButtonClassName}`}
              onClick={handleInitializeGame}
            >
              초기화
            </button>
            <button
              type="button"
              className={`btn btn-sm ${teamStyle.answerButtonClassName}`}
              onClick={handleOpenAnswerModal}
            >
              정답보기
            </button>
          </div>
        </div>

        {validationMessage ? (
          <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{validationMessage}</p>
        ) : null}

        <div
          className={`mt-4 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] p-3 ${teamStyle.historyBoxClassName}`}
        >
          {guessHistories.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">아직 시도 내역이 없습니다.</p>
          ) : (
            <ul className="grid gap-2">
              {guessHistories.map((history, historyIndex) => (
                <li
                  key={`${teamName}-${history.value}-${historyIndex}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-[var(--color-text)]">{history.value}</span>
                  {history.isOut ? (
                    <span className="font-semibold text-[var(--color-danger)]">OUT</span>
                  ) : history.strike === 4 ? (
                    <span className="font-semibold text-[var(--color-primary)]">HOMERUN⚾</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-primary)]">{history.strike}S</span>
                      <span className="font-semibold text-[var(--color-success)]">{history.ball}B</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <ActionModal
        isOpen={isAnswerModalOpen}
        title={`${teamName} 정답`}
        message={answerModalMessage}
        buttons={answerModalButtons}
        onClose={handleCloseAnswerModal}
      />
    </>
  );
}
