import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';

import { prisma } from '@/lib/prisma';
import { TEACHER_APPROVAL_STATUS, TEACHER_ROLE } from '@/types/teacher';

const TEACHER_SESSION_SYNC_INTERVAL_SECONDS = 60 * 5;
export const DEFAULT_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * 토큰의 교사 스냅샷(id·권한·승인 상태)을 DB와 동기화한다.
 * 마지막 동기화 후 5분이 지나지 않았으면 건너뛰며, DB를 조회해 토큰을 바꿨으면 true를 반환한다.
 * jwt 콜백과 proxy(쿠키 재발급)가 함께 사용한다.
 */
export async function syncTeacherSnapshot(token: JWT, force = false): Promise<boolean> {
  if (!token.email) {
    return false;
  }

  const nowTimestampSeconds = Math.floor(Date.now() / 1000);
  const lastSyncedAtSeconds = typeof token.teacherSyncedAt === 'number' ? token.teacherSyncedAt : 0;
  const hasTeacherSnapshot = Boolean(token.teacherId) && Boolean(token.role) && Boolean(token.approvalStatus);
  const shouldSkipDatabaseSync =
    hasTeacherSnapshot && !force && nowTimestampSeconds - lastSyncedAtSeconds < TEACHER_SESSION_SYNC_INTERVAL_SECONDS;

  if (shouldSkipDatabaseSync) {
    return false;
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: token.email.toLowerCase() },
  });

  token.teacherSyncedAt = nowTimestampSeconds;

  if (!teacher) {
    // 삭제된 교사는 이전 승인 스냅샷을 비워 세션 가드가 차단하도록 한다.
    delete token.teacherId;
    delete token.role;
    delete token.approvalStatus;
    return true;
  }

  token.teacherId = teacher.id;
  token.role = teacher.role;
  token.approvalStatus = teacher.approvalStatus;
  token.name = teacher.name ?? token.name;

  return true;
}

const parseAdminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: DEFAULT_TOKEN_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: DEFAULT_TOKEN_MAX_AGE_SECONDS,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const email = user.email.toLowerCase();
      const isAdmin = parseAdminEmails().includes(email);

      await prisma.teacher.upsert({
        where: { email },
        create: {
          email,
          name: user.name ?? null,
          role: isAdmin ? TEACHER_ROLE.ADMIN : TEACHER_ROLE.TEACHER,
          approvalStatus: isAdmin ? TEACHER_APPROVAL_STATUS.APPROVED : TEACHER_APPROVAL_STATUS.PENDING,
        },
        update: {
          ...(isAdmin
            ? {
                role: TEACHER_ROLE.ADMIN,
                approvalStatus: TEACHER_APPROVAL_STATUS.APPROVED,
              }
            : {}),
        },
      });

      return true;
    },
    async jwt({ token, trigger, user }) {
      await syncTeacherSnapshot(token, Boolean(user) || trigger === 'update');
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.teacherId as string | undefined;
        session.user.name = token.name as string | undefined;
        session.user.role = token.role as 'ADMIN' | 'TEACHER' | undefined;
        session.user.approvalStatus = token.approvalStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
      }

      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
};
