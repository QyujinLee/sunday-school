import 'next-auth';
import 'next-auth/jwt';

import type { TeacherApprovalStatus, TeacherRole } from '@/types/teacher';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: TeacherRole;
      approvalStatus?: TeacherApprovalStatus;
    } & Session['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    teacherId?: string;
    role?: TeacherRole;
    approvalStatus?: TeacherApprovalStatus;
  }
}
