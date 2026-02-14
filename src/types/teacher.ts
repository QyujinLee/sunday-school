export const TEACHER_ROLE = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
} as const;

export const TEACHER_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type TeacherRole = (typeof TEACHER_ROLE)[keyof typeof TEACHER_ROLE];
export type TeacherApprovalStatus = (typeof TEACHER_APPROVAL_STATUS)[keyof typeof TEACHER_APPROVAL_STATUS];
