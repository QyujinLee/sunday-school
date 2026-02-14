import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { prisma } from '@/lib/prisma';
import { TEACHER_APPROVAL_STATUS, TEACHER_ROLE } from '@/types/teacher';

const parseAdminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
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
          name: user.name ?? undefined,
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
    async jwt({ token }) {
      if (!token.email) {
        return token;
      }

      const teacher = await prisma.teacher.findUnique({
        where: { email: token.email.toLowerCase() },
      });

      if (!teacher) {
        return token;
      }

      token.teacherId = teacher.id;
      token.role = teacher.role;
      token.approvalStatus = teacher.approvalStatus;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.teacherId as string | undefined;
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
