'use client';

import { useMemo } from 'react';
import { AttendanceStatus, Gender } from '@prisma/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/common/ToastProvider';
import { getButtonClassName } from '@/lib/button';
import {
  ATTENDANCE_TABS,
  getGenderLabel,
  getGradeDisplayLabel,
  type AttendanceTabKey,
} from '@/server/attendance/service';
import { formatDateToKoreanYmd } from '@/utils/date';

import CollapsiblePanel from './CollapsiblePanel';

type SerializableStudentRow = {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string;
  currentTalent: number;
  weeklyExtraTalent: number;
  gradeLabel: string;
  attendanceStatus: AttendanceStatus;
};

type SerializableTalentLogRow = {
  id: string;
  amount: number;
  transactedAt: string;
  student: {
    name: string;
  };
  teacher: {
    name: string | null;
    email: string;
  } | null;
};

type InteractiveAttendancePayload = {
  studentsForTable: SerializableStudentRow[];
  talentLogs: SerializableTalentLogRow[];
};

type AttendanceInteractiveSectionProps = {
  selectedTab: AttendanceTabKey;
  attendanceDateText: string;
  nextSundayDateText: string;
  initialData: InteractiveAttendancePayload;
};

type ToggleAttendanceInput = {
  studentId: string;
  expectedCurrentStatus: AttendanceStatus;
  nextStatus: AttendanceStatus;
};

type AdjustTalentInput = {
  studentId: string;
  amount: number;
};

/**
 * 출석 인터랙션 데이터를 조회한다.
 */
async function fetchInteractiveAttendance(selectedTab: AttendanceTabKey): Promise<InteractiveAttendancePayload> {
  const response = await fetch(`/api/attendance/interactive?attendance_tab=${selectedTab}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('interactive_fetch_failed');
  }

  return response.json();
}

/**
 * 출석 상태를 토글한다.
 */
async function requestToggleAttendance(input: ToggleAttendanceInput): Promise<void> {
  const response = await fetch('/api/attendance/interactive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'toggle_attendance',
      student_id: input.studentId,
      expected_current_status: input.expectedCurrentStatus,
      next_status: input.nextStatus,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('stale_state');
    }

    throw new Error('attendance_toggle_failed');
  }
}

/**
 * 달란트를 조정한다.
 */
async function requestAdjustTalent(input: AdjustTalentInput): Promise<void> {
  const response = await fetch('/api/attendance/interactive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'adjust_talent',
      student_id: input.studentId,
      amount: input.amount,
    }),
  });

  if (!response.ok) {
    throw new Error('talent_adjust_failed');
  }
}

/**
 * 달란트 변동 기록 모바일 카드 목록을 렌더링한다.
 */
function TalentLogCardList({ logs }: { logs: SerializableTalentLogRow[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        기록된 로그가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">{log.student.name}</p>
            <p className={`text-sm font-semibold ${log.amount >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'}`}>
              {log.amount > 0 ? `+${log.amount}` : log.amount}
            </p>
          </div>
          <p className="mt-1 break-all text-xs text-[var(--color-muted)]">
            처리 교사: {log.teacher?.name ?? log.teacher?.email ?? '-'}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            시각:{' '}
            {new Intl.DateTimeFormat('ko-KR', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Asia/Seoul',
            }).format(new Date(log.transactedAt))}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * 출석 관리 인터랙션 영역을 렌더링한다.
 */
export default function AttendanceInteractiveSection({
  selectedTab,
  attendanceDateText,
  nextSundayDateText,
  initialData,
}: AttendanceInteractiveSectionProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = useMemo(() => ['attendance', 'interactive', selectedTab] as const, [selectedTab]);

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchInteractiveAttendance(selectedTab),
    initialData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const toggleAttendanceMutation = useMutation({
    mutationFn: requestToggleAttendance,
    onMutate: async ({ studentId, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<InteractiveAttendancePayload>(queryKey);

      queryClient.setQueryData<InteractiveAttendancePayload>(queryKey, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          studentsForTable: current.studentsForTable.map((student) =>
            student.id === studentId ? { ...student, attendanceStatus: nextStatus } : student,
          ),
        };
      });

      return { previousData };
    },
    onError: (error, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (error instanceof Error && error.message === 'stale_state') {
        showToast({
          variant: 'info',
          message: '이미 다른 교사가 상태를 변경했습니다.',
          description: '최신 상태를 다시 불러옵니다.',
        });
      } else {
        showToast({
          variant: 'error',
          message: '출석 상태 변경에 실패했습니다.',
          description: '잠시 후 다시 시도해 주세요.',
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', 'interactive'] });
    },
  });

  const adjustTalentMutation = useMutation({
    mutationFn: requestAdjustTalent,
    onMutate: async ({ studentId, amount }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<InteractiveAttendancePayload>(queryKey);

      queryClient.setQueryData<InteractiveAttendancePayload>(queryKey, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          studentsForTable: current.studentsForTable.map((student) =>
            student.id === studentId ? { ...student, weeklyExtraTalent: student.weeklyExtraTalent + amount } : student,
          ),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      showToast({
        variant: 'success',
        message: '달란트를 조정했습니다.',
      });
    },
    onError: (_error, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      showToast({
        variant: 'error',
        message: '달란트 조정에 실패했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', 'interactive'] });
    },
  });

  const studentsForTable = data.studentsForTable;
  const talentLogs = data.talentLogs;

  /**
   * 학년 표시 문자열을 반환한다.
   */
  function getStudentGradeDisplayLabel(student: SerializableStudentRow): string {
    return getGradeDisplayLabel({
      gradeLabel: student.gradeLabel as never,
      birthDate: new Date(student.birthDate),
    });
  }

  /**
   * 출석 상태를 토글한다.
   */
  function handleToggleAttendance(
    studentId: string,
    expectedCurrentStatus: AttendanceStatus,
    nextStatus: AttendanceStatus,
  ) {
    toggleAttendanceMutation.mutate({
      studentId,
      expectedCurrentStatus,
      nextStatus,
    });
  }

  /**
   * 달란트를 조정한다.
   */
  function handleAdjustTalent(studentId: string, amount: number) {
    adjustTalentMutation.mutate({
      studentId,
      amount,
    });
  }

  return (
    <>
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">출석 관리</h1>
          <p className="text-sm text-[var(--color-muted)]">
            기준 출석일: {attendanceDateText}
            <span className="block sm:inline">
              <span className="hidden sm:inline"> / </span>
              수정 가능 기한: {nextSundayDateText} 이전
            </span>
          </p>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="출석 필터 탭">
          {ATTENDANCE_TABS.map((tab) => {
            const isSelected = selectedTab === tab.key;

            return (
              <a
                key={tab.key}
                href={`/attendance?attendance_tab=${tab.key}`}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
                }`}
                aria-current={isSelected ? 'page' : undefined}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-5 sm:hidden">
          {selectedTab === 'this_week' ? (
            studentsForTable.length === 0 ? (
              <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
                표시할 학생이 없습니다.
              </p>
            ) : (
              <ul className="grid gap-3">
                {studentsForTable.map((student) => (
                  <li key={student.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[var(--color-text)]">{student.name}</p>
                      <p className="text-sm font-medium text-[var(--color-primary)]">
                        {getStudentGradeDisplayLabel(student)}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">
                      금주 추가 달란트:{' '}
                      <span className="font-semibold text-[var(--color-text)]">
                        {student.weeklyExtraTalent > 0 ? `+${student.weeklyExtraTalent}` : student.weeklyExtraTalent}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[3, 2, 1].map((amount) => (
                        <button
                          key={`${student.id}-${amount}`}
                          type="button"
                          onClick={() => handleAdjustTalent(student.id, amount)}
                          className={getButtonClassName({
                            variant: 'secondary',
                            tone: 'success',
                            size: 'sm',
                            round: 'pill',
                            className: 'min-w-[42px]',
                          })}
                        >
                          +{amount}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAdjustTalent(student.id, -1)}
                        className={getButtonClassName({
                          variant: 'secondary',
                          tone: 'danger',
                          size: 'sm',
                          round: 'pill',
                          className: 'min-w-[42px]',
                        })}
                      >
                        -1
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : studentsForTable.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
              표시할 학생이 없습니다.
            </p>
          ) : (
            <ul className="grid gap-3">
              {studentsForTable.map((student) => {
                const isPresent = student.attendanceStatus === AttendanceStatus.PRESENT;
                const nextStatus = isPresent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;

                return (
                  <li key={student.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[var(--color-text)]">{student.name}</p>
                      <p className="text-sm font-medium text-[var(--color-primary)]">
                        {getStudentGradeDisplayLabel(student)}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-[var(--color-muted)]">성별</dt>
                      <dd className="text-right text-[var(--color-text)]">{getGenderLabel(student.gender)}</dd>
                      <dt className="text-[var(--color-muted)]">생일</dt>
                      <dd className="text-right text-[var(--color-text)]">
                        {formatDateToKoreanYmd(new Date(student.birthDate))}
                      </dd>
                    </dl>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleAttendance(student.id, student.attendanceStatus, nextStatus)
                        }
                        className={getButtonClassName({
                          variant: 'primary',
                          tone: isPresent ? 'danger' : 'success',
                          size: 'sm',
                          round: 'pill',
                          className: 'min-w-[68px]',
                        })}
                      >
                        {isPresent ? '결석' : '출석'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          {selectedTab === 'this_week' ? (
            <table className="w-full border-collapse text-center">
              <thead className="bg-[var(--color-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학년</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">금주 추가 달란트</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">달란트 조정</th>
                </tr>
              </thead>
              <tbody>
                {studentsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                      표시할 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  studentsForTable.map((student) => (
                    <tr key={student.id} className="border-t border-[var(--color-border)]">
                      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                        {getStudentGradeDisplayLabel(student)}
                      </td>
                      <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.name}</td>
                      <td className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">
                        {student.weeklyExtraTalent > 0 ? `+${student.weeklyExtraTalent}` : student.weeklyExtraTalent}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center gap-1.5">
                          {[3, 2, 1].map((amount) => (
                            <button
                              key={`${student.id}-${amount}`}
                              type="button"
                              onClick={() => handleAdjustTalent(student.id, amount)}
                              className={getButtonClassName({
                                variant: 'secondary',
                                tone: 'success',
                                size: 'sm',
                                round: 'pill',
                                className: 'min-w-[42px]',
                              })}
                            >
                              +{amount}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAdjustTalent(student.id, -1)}
                            className={getButtonClassName({
                              variant: 'secondary',
                              tone: 'danger',
                              size: 'sm',
                              round: 'pill',
                              className: 'min-w-[42px]',
                            })}
                          >
                            -1
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-center">
              <thead className="bg-[var(--color-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학년</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">성별</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">생일</th>
                  <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">출석</th>
                </tr>
              </thead>
              <tbody>
                {studentsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                      표시할 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  studentsForTable.map((student) => {
                    const isPresent = student.attendanceStatus === AttendanceStatus.PRESENT;
                    const nextStatus = isPresent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;

                    return (
                      <tr key={student.id} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                          {getStudentGradeDisplayLabel(student)}
                        </td>
                        <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.name}</td>
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{getGenderLabel(student.gender)}</td>
                        <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                          {formatDateToKoreanYmd(new Date(student.birthDate))}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAttendance(student.id, student.attendanceStatus, nextStatus)
                            }
                            className={getButtonClassName({
                              variant: 'primary',
                              tone: isPresent ? 'danger' : 'success',
                              size: 'sm',
                              round: 'pill',
                              className: 'min-w-[68px]',
                            })}
                          >
                            {isPresent ? '결석' : '출석'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <CollapsiblePanel
        title="달란트 변동 기록"
        description="출석을 제외한 금주 추가 달란트 조정 내역이 최신순으로 기록됩니다."
        storageKey="attendance_talent_log_collapsible"
      >
        <div className="sm:hidden">
          <TalentLogCardList logs={talentLogs} />
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] sm:block">
          <table className="w-full border-collapse text-center">
            <thead className="bg-[var(--color-surface-soft)]">
              <tr>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학생</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">변동</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">처리 교사</th>
                <th className="w-1/4 px-2 py-2 text-sm font-semibold text-[var(--color-text)]">시각</th>
              </tr>
            </thead>
            <tbody>
              {talentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-sm text-[var(--color-muted)]">
                    기록된 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                talentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[var(--color-border)]">
                    <td className="px-2 py-2 text-sm text-[var(--color-text)]">{log.student.name}</td>
                    <td
                      className={`px-2 py-2 text-sm font-semibold ${
                        log.amount >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {log.amount > 0 ? `+${log.amount}` : log.amount}
                    </td>
                    <td className="px-2 py-2 text-sm text-[var(--color-muted)]">
                      {log.teacher?.name ?? log.teacher?.email ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-sm text-[var(--color-muted)]">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Asia/Seoul',
                      }).format(new Date(log.transactedAt))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>
    </>
  );
}
