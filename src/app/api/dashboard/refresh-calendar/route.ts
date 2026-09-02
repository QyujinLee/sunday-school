import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { requireApprovedTeacher } from '@/lib/api-session';

/**
 * 주간 일정(구글 캘린더) 데이터 캐시를 무효화한다.
 */
export async function POST() {
  const guardResult = await requireApprovedTeacher();

  if (!guardResult.ok) {
    return guardResult.response;
  }

  revalidatePath('/dashboard');
  revalidatePath('/attendance');

  return NextResponse.json({ message: 'ok' });
}
