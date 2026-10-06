import type { JWT } from 'next-auth/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: { teacher: { findUnique: findUniqueMock } },
}));

const { authOptions, syncTeacherSnapshot } = await import('@/lib/auth');

/**
 * jwt 콜백을 사용자 로그인 직후가 아닌 일반 요청 조건으로 호출한다.
 */
function runJwtCallback(token: JWT) {
  const jwtCallback = authOptions.callbacks!.jwt!;
  return jwtCallback({ token, trigger: undefined, user: undefined } as unknown as Parameters<typeof jwtCallback>[0]);
}

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe('authOptions.callbacks.jwt', () => {
  it('동기화 주기가 지난 토큰의 교사가 삭제됐으면 승인 스냅샷을 비운다', async () => {
    findUniqueMock.mockResolvedValue(null);

    const token = await runJwtCallback({
      email: 'deleted@example.com',
      teacherId: 'teacher-1',
      role: 'TEACHER',
      approvalStatus: 'APPROVED',
      teacherSyncedAt: 0,
    });

    expect(token.teacherId).toBeUndefined();
    expect(token.role).toBeUndefined();
    expect(token.approvalStatus).toBeUndefined();
  });

  it('교사가 존재하면 DB의 승인 상태와 권한으로 갱신한다', async () => {
    findUniqueMock.mockResolvedValue({ id: 'teacher-1', role: 'TEACHER', approvalStatus: 'REJECTED', name: '김교사' });

    const token = await runJwtCallback({
      email: 'teacher@example.com',
      teacherId: 'teacher-1',
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
      teacherSyncedAt: 0,
    });

    expect(token.role).toBe('TEACHER');
    expect(token.approvalStatus).toBe('REJECTED');
  });
});

describe('syncTeacherSnapshot', () => {
  it('마지막 동기화 후 5분이 지나지 않았으면 DB를 조회하지 않고 false를 반환한다', async () => {
    const token = {
      email: 'teacher@example.com',
      teacherId: 'teacher-1',
      role: 'TEACHER' as const,
      approvalStatus: 'APPROVED' as const,
      teacherSyncedAt: Math.floor(Date.now() / 1000) - 60,
    };

    expect(await syncTeacherSnapshot(token)).toBe(false);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('주기가 지났으면 DB와 동기화하고 동기화 시각을 갱신한다', async () => {
    findUniqueMock.mockResolvedValue({ id: 'teacher-1', role: 'TEACHER', approvalStatus: 'APPROVED', name: null });
    const token: JWT = { email: 'teacher@example.com', teacherSyncedAt: 0 };

    expect(await syncTeacherSnapshot(token)).toBe(true);
    expect(token.approvalStatus).toBe('APPROVED');
    expect(token.teacherSyncedAt).toBeGreaterThan(0);
  });
});
