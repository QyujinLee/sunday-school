import type { Metadata } from 'next';

import TeachersView from '@/app/teachers/TeachersView';
import { getGuestTeachers } from '@/server/guest/demo-data';

export const metadata: Metadata = {
  title: '게스트 교사 정보',
};

/**
 * 데모 데이터로 교사 정보 화면을 렌더링한다.
 * DB를 조회하지 않으며, 수정 링크는 노출하지 않는다(관리 권한 없음 + 본인 계정 없음).
 */
export default function GuestTeachersPage() {
  return <TeachersView teachers={getGuestTeachers()} canManageAll={false} />;
}
