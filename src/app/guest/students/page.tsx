import type { Metadata } from 'next';

import StudentsView, { getSelectedGradeTab } from '@/app/students/StudentsView';
import { getGuestStudents } from '@/server/guest/demo-data';

export const metadata: Metadata = {
  title: '게스트 학생 관리',
};

type GuestStudentsPageProps = {
  searchParams?: Promise<{
    grade_tab?: string | string[];
  }>;
};

/**
 * 데모 데이터로 학생 관리 화면을 렌더링한다.
 * DB를 조회하지 않으며 등록·수정·출석부 같은 쓰기 진입점은 노출하지 않는다.
 */
export default async function GuestStudentsPage({ searchParams }: GuestStudentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedGradeTab = getSelectedGradeTab(resolvedSearchParams?.grade_tab);

  return (
    <StudentsView
      students={getGuestStudents()}
      selectedGradeTab={selectedGradeTab}
      isAdmin={false}
      canManage={false}
      basePath="/guest/students"
    />
  );
}
