import Link from 'next/link';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';
import { formatDateToKoreanYmd } from '@/utils/date';
import CollapsiblePanel from './CollapsiblePanel';
import StudentAttendanceLedgerButton from './StudentAttendanceLedgerButton';
import StudentDetailButton from './StudentDetailButton';
import StudentsResultToast from './StudentsResultToast';
import TalentResetButton from './TalentResetButton';

const STUDENT_GRADE_TABS = ['전체', '6학년', '5학년', '4학년', '3학년', '2학년', '1학년', '유아부'] as const;
type StudentGradeTab = (typeof STUDENT_GRADE_TABS)[number];

type StudentsPageProps = {
  searchParams?: Promise<{
    grade_tab?: string | string[];
  }>;
};

type StudentRow = {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: Date;
  address: string;
  phone: string | null;
  currentTalent: number;
  guardianContact: {
    name: string;
    relationship: 'FATHER' | 'MOTHER' | 'GRANDFATHER' | 'GRANDMOTHER' | 'ETC';
    phone: string;
  } | null;
  gradeLabel: Exclude<StudentGradeTab, '전체'>;
};

/**
 * URL 쿼리에서 유효한 학년 탭 값을 반환한다.
 */
function getSelectedGradeTab(gradeTab: string | string[] | undefined): StudentGradeTab {
  const resolvedValue = Array.isArray(gradeTab) ? gradeTab[0] : gradeTab;

  if (resolvedValue && STUDENT_GRADE_TABS.includes(resolvedValue as StudentGradeTab)) {
    return resolvedValue as StudentGradeTab;
  }

  return '전체';
}

/**
 * 학생 생년을 기준으로 현재 학년 라벨을 계산한다.
 */
function getGradeLabelByBirthDate(birthDate: Date): Exclude<StudentGradeTab, '전체'> {
  const today = new Date();
  const schoolYear = today.getMonth() + 1 >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const gradeNumber = schoolYear - birthDate.getFullYear() - 6;

  if (gradeNumber >= 1 && gradeNumber <= 6) {
    return `${gradeNumber}학년` as Exclude<StudentGradeTab, '전체'>;
  }

  return '유아부';
}

/**
 * 생년월일을 yyyy-mm-dd 형식으로 반환한다.
 */
function formatBirthDate(birthDate: Date): string {
  return formatDateToKoreanYmd(birthDate);
}

/**
 * 성별 코드를 한글 라벨로 변환한다.
 */
function getGenderLabel(gender: 'MALE' | 'FEMALE'): string {
  return gender === 'MALE' ? '남' : '여';
}

/**
 * 학년 표시 문자열을 반환한다. 유아부는 연 나이를 함께 표시한다.
 */
function getGradeDisplayLabel(student: Pick<StudentRow, 'gradeLabel' | 'birthDate'>): string {
  if (student.gradeLabel !== '유아부') {
    return student.gradeLabel;
  }

  const currentYear = new Date().getFullYear();
  const yearlyAge = Math.max(0, currentYear - student.birthDate.getFullYear());

  return `유아부 (연 ${yearlyAge}세)`;
}

/**
 * 보호자 관계 코드를 한글 라벨로 변환한다.
 */
function getRelationshipLabel(relationship: 'FATHER' | 'MOTHER' | 'GRANDFATHER' | 'GRANDMOTHER' | 'ETC'): string {
  if (relationship === 'FATHER') {
    return '부';
  }

  if (relationship === 'MOTHER') {
    return '모';
  }

  if (relationship === 'GRANDFATHER') {
    return '조부';
  }

  if (relationship === 'GRANDMOTHER') {
    return '조모';
  }

  return '기타';
}

/**
 * 현재 날짜 기준 만 나이를 계산한다.
 */
function getCurrentAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

/**
 * 현재 날짜 기준 졸업 조건(만 14세 이상 + 3월 이후)에 해당하는지 반환한다.
 */
function isGraduateByCurrentDate(birthDate: Date): boolean {
  const today = new Date();
  const isAfterMarch = today.getMonth() + 1 >= 3;
  const age = getCurrentAge(birthDate);

  return isAfterMarch && age >= 14;
}

/**
 * 학생 목록에서 선택한 학년 탭에 맞는 학생만 필터링한다.
 */
function filterStudentsByGradeTab(students: StudentRow[], selectedGradeTab: StudentGradeTab): StudentRow[] {
  if (selectedGradeTab === '전체') {
    return students;
  }

  return students.filter((student) => student.gradeLabel === selectedGradeTab);
}

/**
 * 선택된 학년 탭 기준으로 학생 목록 정렬을 적용한다.
 */
function sortStudentsBySelectedGradeTab(students: StudentRow[]): StudentRow[] {
  return sortStudentsByGradeDescThenName(students);
}

/**
 * 학생 모바일 카드 목록을 렌더링한다.
 */
function StudentCardList({ students }: { students: StudentRow[] }) {
  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] px-3 py-3 text-center text-sm text-[var(--color-muted)]">
        표시할 학생이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {students.map((student) => (
        <li key={student.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-[var(--color-text)]">{student.name}</p>
            <p className="text-sm font-medium text-[var(--color-primary)]">{getGradeDisplayLabel(student)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-[var(--color-muted)]">성별</dt>
            <dd className="text-right text-[var(--color-text)]">{getGenderLabel(student.gender)}</dd>
            <dt className="text-[var(--color-muted)]">생일</dt>
            <dd className="text-right text-[var(--color-text)]">{formatBirthDate(student.birthDate)}</dd>
            <dt className="text-[var(--color-muted)]">주소</dt>
            <dd className="truncate text-right text-[var(--color-text)]">{student.address}</dd>
            <dt className="text-[var(--color-muted)]">전화번호</dt>
            <dd className="text-right text-[var(--color-text)]">{student.phone ?? '-'}</dd>
            <dt className="text-[var(--color-muted)]">달란트</dt>
            <dd className="text-right font-medium text-[var(--color-text)]">{student.currentTalent}</dd>
            <dt className="text-[var(--color-muted)]">보호자 성함</dt>
            <dd className="text-right text-[var(--color-text)]">{student.guardianContact?.name ?? '-'}</dd>
            <dt className="text-[var(--color-muted)]">관계</dt>
            <dd className="text-right text-[var(--color-text)]">
              {student.guardianContact?.relationship ? getRelationshipLabel(student.guardianContact.relationship) : '-'}
            </dd>
            <dt className="text-[var(--color-muted)]">보호자 전화번호</dt>
            <dd className="text-right text-[var(--color-text)]">{student.guardianContact?.phone ?? '-'}</dd>
          </dl>

          <div className="mt-3 flex justify-end">
            <StudentAttendanceLedgerButton studentId={student.id} />
            <Link
              href={`/students/${student.id}/edit`}
              prefetch={false}
              className="btn btn-secondary btn-sm ml-2"
            >
              수정
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 학생 테이블 본문 행 목록을 렌더링한다.
 */
function StudentsTableRows({ students }: { students: StudentRow[] }) {
  if (students.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-2 py-2 text-center text-sm text-[var(--color-muted)]">
          표시할 학생이 없습니다.
        </td>
      </tr>
    );
  }

  return students.map((student) => (
    <tr key={student.id} className="border-t border-[var(--color-border)]">
      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{getGradeDisplayLabel(student)}</td>
      <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.name}</td>
      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{getGenderLabel(student.gender)}</td>
      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{formatBirthDate(student.birthDate)}</td>
      <td className="px-2 py-2 text-sm font-medium text-[var(--color-text)]">{student.currentTalent}</td>
      <td className="px-2 py-2 text-sm text-[var(--color-muted)]">{student.guardianContact?.phone ?? '-'}</td>
      <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <StudentDetailButton
            name={student.name}
            gradeLabel={getGradeDisplayLabel(student)}
            genderLabel={getGenderLabel(student.gender)}
            birthDateText={formatBirthDate(student.birthDate)}
            address={student.address}
            phone={student.phone ?? '-'}
            currentTalent={student.currentTalent}
            guardianName={student.guardianContact?.name ?? '-'}
            relationshipLabel={
              student.guardianContact?.relationship ? getRelationshipLabel(student.guardianContact.relationship) : '-'
            }
            guardianPhone={student.guardianContact?.phone ?? '-'}
          />
          <StudentAttendanceLedgerButton studentId={student.id} />
          <Link
            href={`/students/${student.id}/edit`}
            prefetch={false}
            className="btn btn-secondary btn-sm"
          >
            수정
          </Link>
        </div>
      </td>
    </tr>
  ));
}

/**
 * 학생 테이블을 렌더링한다.
 */
function StudentsTable({ students }: { students: StudentRow[] }) {
  return (
    <div className="hidden sm:block">
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full border-collapse text-center">
          <thead className="bg-[var(--color-surface-soft)]">
            <tr>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">학년</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">이름</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">성별</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">생일</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">달란트</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">보호자 전화번호</th>
              <th className="px-2 py-2 text-sm font-semibold text-[var(--color-text)]">관리</th>
            </tr>
          </thead>
          <tbody>
            <StudentsTableRows students={students} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 학생 관리 페이지를 렌더링한다.
 */
export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedGradeTab = getSelectedGradeTab(resolvedSearchParams?.grade_tab);
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'ADMIN';

  const students = await prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      address: true,
      phone: true,
      currentTalent: true,
      guardianContact: {
        select: {
          name: true,
          relationship: true,
          phone: true,
        },
      },
    },
  });

  const studentsWithGrade: StudentRow[] = students
    .map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDate(student.birthDate),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  const graduateStudents = studentsWithGrade.filter((student) => isGraduateByCurrentDate(student.birthDate));
  const activeStudents = studentsWithGrade.filter((student) => !isGraduateByCurrentDate(student.birthDate));
  const filteredStudents = sortStudentsBySelectedGradeTab(
    filterStudentsByGradeTab(activeStudents, selectedGradeTab),
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <StudentsResultToast />
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">학생 관리</h1>
          <div className="flex items-center gap-2">
            {isAdmin ? <TalentResetButton /> : null}
            <Link
              href="/students/new"
              prefetch={false}
              className="btn btn-primary btn-md"
            >
              학생 등록
            </Link>
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="학년 필터">
          {STUDENT_GRADE_TABS.map((gradeTab) => {
            const isSelected = selectedGradeTab === gradeTab;

            return (
              <Link
                key={gradeTab}
                href={gradeTab === '전체' ? '/students' : `/students?grade_tab=${encodeURIComponent(gradeTab)}`}
                prefetch={false}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]'
                }`}
                aria-current={isSelected ? 'page' : undefined}
              >
                {gradeTab}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 sm:hidden">
          <StudentCardList students={filteredStudents} />
        </div>
        <div className="mt-5 hidden sm:block">
          <StudentsTable students={filteredStudents} />
        </div>
      </section>

      <CollapsiblePanel
        title="졸업생"
        description="현재 날짜 기준 만 14세 이상이고 3월 이후인 학생은 자동으로 졸업생 목록으로 이동합니다."
        storageKey="students_graduates_collapsible"
      >
        <div className="sm:hidden">
          <StudentCardList students={graduateStudents} />
        </div>
        <div className="hidden sm:block">
          <StudentsTable students={graduateStudents} />
        </div>
      </CollapsiblePanel>
    </main>
  );
}


