import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const { requireAdminTeacher, requireApprovedTeacher } = await import('@/lib/api-session');

/**
 * 세션 모킹용 사용자 정보를 만든다.
 */
function sessionUser(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'teacher-1',
      name: '김교사',
      email: 'teacher@example.com',
      role: 'TEACHER',
      approvalStatus: 'APPROVED',
      ...overrides,
    },
  };
}

beforeEach(() => {
  getServerSessionMock.mockReset();
});

describe('requireApprovedTeacher', () => {
  it('세션이 없으면 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(null);

    const result = await requireApprovedTeacher();

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.response.status).toBe(403);
  });

  it('승인 대기 상태면 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ approvalStatus: 'PENDING' }));

    const result = await requireApprovedTeacher();

    expect(result.ok).toBe(false);
  });

  it('거절 상태면 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ approvalStatus: 'REJECTED' }));

    expect((await requireApprovedTeacher()).ok).toBe(false);
  });

  it('교사 id가 없으면 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ id: undefined }));

    expect((await requireApprovedTeacher()).ok).toBe(false);
  });

  it('승인된 일반 교사는 통과하되 관리자 플래그는 false다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser());

    const result = await requireApprovedTeacher();

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.teacherId).toBe('teacher-1');
    expect(result.ok === true && result.isAdmin).toBe(false);
  });

  it('승인된 관리자는 관리자 플래그가 true다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ role: 'ADMIN' }));

    const result = await requireApprovedTeacher();

    expect(result.ok === true && result.isAdmin).toBe(true);
  });
});

describe('requireAdminTeacher', () => {
  it('승인된 일반 교사는 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser());

    const result = await requireAdminTeacher();

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.response.status).toBe(403);
  });

  it('승인되지 않은 관리자는 403을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ role: 'ADMIN', approvalStatus: 'PENDING' }));

    expect((await requireAdminTeacher()).ok).toBe(false);
  });

  it('승인된 관리자만 통과한다', async () => {
    getServerSessionMock.mockResolvedValue(sessionUser({ role: 'ADMIN' }));

    expect((await requireAdminTeacher()).ok).toBe(true);
  });
});
