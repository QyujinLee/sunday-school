'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import TeamBlock, { type GuessHistory } from '@/components/number-baseball/TeamBlock';

const TEAM_CONFIGS = [
  { id: 'purple_bears', color: 'purple', name: '🐻 퍼플 베어스' },
  { id: 'blue_tigers', color: 'blue', name: '🐯 블루 타이거즈' },
  { id: 'yellow_eagles', color: 'yellow', name: '🦅 옐로 이글스' },
  { id: 'red_lions', color: 'red', name: '🦁 레드 라이언스' },
] as const;

type TeamId = (typeof TEAM_CONFIGS)[number]['id'];
type RankByTeamId = Partial<Record<TeamId, number>>;
type TeamSnapshotById = Partial<Record<TeamId, GuessHistory[]>>;
type TeamModalStyle = {
  wrapperClassName: string;
  listClassName: string;
  itemClassName: string;
};

const TEAM_MODAL_STYLE_BY_ID: Record<TeamId, TeamModalStyle> = {
  purple_bears: {
    wrapperClassName: 'border-[#8b6bff] bg-[rgb(139_107_255/0.08)]',
    listClassName: 'border-[#b8a3ff] bg-[rgb(139_107_255/0.12)]',
    itemClassName: 'border-[#c8b8ff] bg-[var(--color-surface)]',
  },
  blue_tigers: {
    wrapperClassName: 'border-[var(--color-primary)] bg-[rgb(var(--color-primary-rgb)/0.1)]',
    listClassName: 'border-[var(--color-border-strong)] bg-[rgb(var(--color-primary-rgb)/0.12)]',
    itemClassName: 'border-[var(--color-border)] bg-[var(--color-surface)]',
  },
  yellow_eagles: {
    wrapperClassName: 'border-[#e7c25d] bg-[rgb(231_194_93/0.15)]',
    listClassName: 'border-[#edd588] bg-[rgb(231_194_93/0.22)]',
    itemClassName: 'border-[#e5cd7a] bg-[var(--color-surface)]',
  },
  red_lions: {
    wrapperClassName: 'border-[#dd6f74] bg-[rgb(221_111_116/0.12)]',
    listClassName: 'border-[#efb3b7] bg-[rgb(221_111_116/0.18)]',
    itemClassName: 'border-[#e8a2a6] bg-[var(--color-surface)]',
  },
};

/**
 * 숫자야구 페이지를 렌더링한다.
 */
export default function NumberBaseballPage() {
  const [rankByTeamId, setRankByTeamId] = useState<RankByTeamId>({});
  const [teamSnapshotById, setTeamSnapshotById] = useState<TeamSnapshotById>({});
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState<boolean>(false);

  const rankedTeamCount = useMemo(() => Object.keys(rankByTeamId).length, [rankByTeamId]);
  const ongoingTeamConfigs = useMemo(
    () =>
      TEAM_CONFIGS.filter((teamConfig) => !rankByTeamId[teamConfig.id] && (teamSnapshotById[teamConfig.id]?.length ?? 0) > 0),
    [rankByTeamId, teamSnapshotById],
  );

  useEffect(() => {
    if (!isOverviewModalOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOverviewModalOpen]);

  /**
   * 특정 팀의 홈런 달성 순위를 기록한다.
   */
  function handleTeamHomerun(teamId: TeamId) {
    setRankByTeamId((previousRankByTeamId) => {
      if (previousRankByTeamId[teamId]) {
        return previousRankByTeamId;
      }

      const nextRank = Object.keys(previousRankByTeamId).length + 1;
      return {
        ...previousRankByTeamId,
        [teamId]: nextRank,
      };
    });
  }

  /**
   * 특정 팀의 홈런 순위를 초기화한다.
   */
  function handleResetTeamRank(teamId: TeamId) {
    setRankByTeamId((previousRankByTeamId) => {
      if (!previousRankByTeamId[teamId]) {
        return previousRankByTeamId;
      }

      const nextRankByTeamId = { ...previousRankByTeamId };
      delete nextRankByTeamId[teamId];
      return nextRankByTeamId;
    });
  }

  /**
   * 팀별 시도 내역 스냅샷을 저장한다.
   */
  const handleTeamSnapshotChange = useCallback((teamId: TeamId, guessHistories: GuessHistory[]) => {
    setTeamSnapshotById((previousSnapshotById) => {
      if (previousSnapshotById[teamId] === guessHistories) {
        return previousSnapshotById;
      }

      return {
        ...previousSnapshotById,
        [teamId]: guessHistories,
      };
    });
  }, []);

  /**
   * 한 눈에 보기 모달을 연다.
   */
  function handleOpenOverviewModal() {
    setIsOverviewModalOpen(true);
  }

  /**
   * 한 눈에 보기 모달을 닫는다.
   */
  function handleCloseOverviewModal() {
    setIsOverviewModalOpen(false);
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">숫자야구</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          각 팀 보드에서 `초기화`로 문제를 만들고 중복되지 않는 4자리 숫자(0 포함)를 입력해 정답을 찾습니다.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">현재 홈런 달성 팀: {rankedTeamCount} / 4</p>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="레크레이션 하위 이동">
          <Link href="/recreation" prefetch={false} className="btn btn-secondary btn-sm">
            레크레이션 홈
          </Link>
          <Link href="/recreation/number-baseball" prefetch={false} className="btn btn-primary btn-sm">
            숫자야구
          </Link>
          <Link href="/recreation/timer" prefetch={false} className="btn btn-secondary btn-sm">
            타이머
          </Link>
        </nav>
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-sm border-[var(--color-primary)] bg-[rgb(var(--color-primary-rgb)/0.14)] text-[var(--color-primary)] hover:bg-[rgb(var(--color-primary-rgb)/0.24)]"
            onClick={handleOpenOverviewModal}
          >
            한 눈에 보기
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TEAM_CONFIGS.map((teamConfig) => (
            <TeamBlock
              key={teamConfig.id}
              teamId={teamConfig.id}
              color={teamConfig.color}
              teamName={teamConfig.name}
              homerunRank={rankByTeamId[teamConfig.id] ?? null}
              onHomerun={handleTeamHomerun}
              onInitialize={handleResetTeamRank}
              onSnapshotChange={handleTeamSnapshotChange}
            />
          ))}
        </div>
      </section>

      {isOverviewModalOpen ? (
        <div
          className="fixed inset-0 z-[100] bg-[rgb(var(--color-dim-rgb)/0.82)] p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="number-baseball-overview-title"
        >
          <section className="mx-auto flex h-full max-w-3xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-5">
            <header className="mb-3 flex items-center justify-between gap-3">
              <h2 id="number-baseball-overview-title" className="text-base font-semibold text-[var(--color-text)] sm:text-lg">
                진행중인 팀 시도 내역
              </h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
                onClick={handleCloseOverviewModal}
                aria-label="닫기"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </header>

            {ongoingTeamConfigs.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                <p className="text-sm text-[var(--color-muted)]">진행중인 팀의 시도 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid h-full gap-3 lg:grid-cols-4">
                  {ongoingTeamConfigs.map((teamConfig) => {
                    const histories = teamSnapshotById[teamConfig.id] ?? [];
                    const teamModalStyle = TEAM_MODAL_STYLE_BY_ID[teamConfig.id];

                    return (
                      <article
                        key={`overview-${teamConfig.id}`}
                        className={`flex min-h-0 flex-col rounded-xl border p-3 ${teamModalStyle.wrapperClassName}`}
                      >
                        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{teamConfig.name}</h3>
                        <div className={`min-h-0 flex-1 overflow-y-auto rounded-lg border p-2 ${teamModalStyle.listClassName}`}>
                          {histories.length === 0 ? (
                            <p className="text-sm text-[var(--color-muted)]">아직 시도 내역이 없습니다.</p>
                          ) : (
                            <ul className="space-y-2">
                              {histories.map((history, historyIndex) => (
                                <li
                                  key={`${teamConfig.id}-${history.value}-${historyIndex}`}
                                  className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-sm ${teamModalStyle.itemClassName}`}
                                >
                                  <span className="font-semibold text-[var(--color-text)]">{history.value}</span>
                                  {history.isOut ? (
                                    <span className="font-semibold text-[var(--color-danger)]">OUT</span>
                                  ) : (
                                    <span className="flex items-center gap-1.5">
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
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
