import type { ReactNode } from 'react';

import Link from 'next/link';

import { sortStudentsByGradeDescThenName } from '@/lib/student-sort';
import { formatDateToKoreanYmd, getKoreanYear } from '@/utils/date';
import { type StudentGradeLabel, getGradeLabelByBirthDateInKst, isGraduateByBirthDateInKst } from '@/utils/grade';

import CollapsiblePanel from './CollapsiblePanel';
import StudentAttendanceLedgerButton from './StudentAttendanceLedgerButton';
import StudentDetailButton from './StudentDetailButton';

export const STUDENT_GRADE_TABS = ['전체', '6학년', '5학년', '4학년', '3학년', '2학년', '1학년', '유아부'] as const;
export type StudentGradeTab = (typeof STUDENT_GRADE_TABS)[number];

export type StudentInput = {
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
};

type StudentRow = StudentInput & {
  gradeLabel: StudentGradeLabel;
};

type StudentsViewProps = {
  students: StudentInput[];
  selectedGradeTab: StudentGradeTab;
  isAdmin: boolean;
  /** 등록·수정·출석부 같은 쓰기 진입점을 노출할지 여부. 게스트 화면에서는 false. */
  canManage: boolean;
  /** 학년 탭 링크의 기준 경로. 실데이터 화면은 /students, 게스트 화면은 /guest/students. */
  basePath: string;
  /** 관리자 전용 달란트 초기화 버튼. 실데이터 화면에서만 전달한다. */
  talentResetSlot?: ReactNode;
};

/**
 * URL 쿼리에서 유효한 학년 탭 값을 반환한다.
 */
export function getSelectedGradeTab(gradeTab: string | string[] | undefined): StudentGradeTab {
  const resolvedValue = Array.isArray(gradeTab) ? gradeTab[0] : gradeTab;

  if (resolvedValue && STUDENT_GRADE_TABS.includes(resolvedValue as StudentGradeTab)) {
    return resolvedValue as StudentGradeTab;
  }

  return '전체';
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

  const currentYearInKst = getKoreanYear(new Date());
  const yearlyAge = Math.max(0, currentYearInKst - getKoreanYear(student.birthDate));

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
 * 학생 목록에서 선택한 학년 탭에 맞는 학생만 필터링한다.
 */
function filterStudentsByGradeTab(students: StudentRow[], selectedGradeTab: StudentGradeTab): StudentRow[] {
  if (selectedGradeTab === '전체') {
    return students;
  }

  return students.filter((student) => student.gradeLabel === selectedGradeTab);
}

/**
 * 학생 모바일 카드 목록을 렌더링한다.
 */
function StudentCardList({ students, canManage }: { students: StudentRow[]; canManage: boolean }) {
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

          {canManage ? (
            <div className="mt-3 flex justify-end">
              <StudentAttendanceLedgerButton studentId={student.id} />
              <Link href={`/students/${student.id}/edit`} prefetch={false} className="btn btn-secondary btn-sm ml-2">
                수정
              </Link>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * 학생 테이블 본문 행 목록을 렌더링한다.
 */
function StudentsTableRows({ students, canManage }: { students: StudentRow[]; canManage: boolean }) {
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
          {canManage ? (
            <>
              <StudentAttendanceLedgerButton studentId={student.id} />
              <Link href={`/students/${student.id}/edit`} prefetch={false} className="btn btn-secondary btn-sm">
                수정
              </Link>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  ));
}

/**
 * 학생 테이블을 렌더링한다.
 */
function StudentsTable({ students, canManage }: { students: StudentRow[]; canManage: boolean }) {
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
            <StudentsTableRows students={students} canManage={canManage} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 학생 관리 화면을 렌더링한다.
 * 데이터 조회는 하지 않으며, 학년 계산은 grade.ts의 공통 함수만 사용한다.
 */
export default function StudentsView({
  students,
  selectedGradeTab,
  isAdmin,
  canManage,
  basePath,
  talentResetSlot,
}: StudentsViewProps) {
  const studentsWithGrade: StudentRow[] = students
    .map((student) => ({
      ...student,
      gradeLabel: getGradeLabelByBirthDateInKst(student.birthDate),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  const graduateStudents = studentsWithGrade.filter((student) => isGraduateByBirthDateInKst(student.birthDate));
  const activeStudents = studentsWithGrade.filter((student) => !isGraduateByBirthDateInKst(student.birthDate));
  const filteredStudents = sortStudentsByGradeDescThenName(filterStudentsByGradeTab(activeStudents, selectedGradeTab));

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">학생 관리</h1>
          {canManage ? (
            <div className="flex items-center gap-2">
              {isAdmin ? talentResetSlot : null}
              <Link href="/students/new" prefetch={false} className="btn btn-primary btn-md">
                학생 등록
              </Link>
            </div>
          ) : null}
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="학년 필터">
          {STUDENT_GRADE_TABS.map((gradeTab) => {
            const isSelected = selectedGradeTab === gradeTab;

            return (
              <Link
                key={gradeTab}
                href={gradeTab === '전체' ? basePath : `${basePath}?grade_tab=${encodeURIComponent(gradeTab)}`}
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
          <StudentCardList students={filteredStudents} canManage={canManage} />
        </div>
        <div className="mt-5 hidden sm:block">
          <StudentsTable students={filteredStudents} canManage={canManage} />
        </div>
      </section>

      <CollapsiblePanel
        title="졸업생"
        description="초등 6학년을 마친 학생은 새 학년이 시작되는 3월부터 자동으로 졸업생 목록으로 이동합니다."
        storageKey="students_graduates_collapsible"
      >
        <div className="sm:hidden">
          <StudentCardList students={graduateStudents} canManage={canManage} />
        </div>
        <div className="hidden sm:block">
          <StudentsTable students={graduateStudents} canManage={canManage} />
        </div>
      </CollapsiblePanel>
    </main>
  );
}
