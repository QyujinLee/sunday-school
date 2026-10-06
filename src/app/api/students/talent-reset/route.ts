import { NextResponse } from 'next/server';

import { requireAdminTeacher } from '@/lib/api-session';
import { prisma } from '@/lib/prisma';

/**
 * 관리자 전용 달란트/달란트 변동 기록 전체 초기화를 수행한다.
 */
export async function POST() {
  const guardResult = await requireAdminTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  try {
    await prisma.$transaction([
      prisma.student.updateMany({
        data: {
          currentTalent: 0,
        },
      }),
      prisma.talentTransaction.deleteMany({}),
    ]);
  } catch {
    return NextResponse.json({ message: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ message: 'ok' });
}
