import Link from 'next/link';

import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  faAddressBook,
  faCalendarCheck,
  faCalendarDays,
  faClipboardList,
  faFolderOpen,
  faGamepad,
  faSackDollar,
  faUserGraduate,
  faUsersGear,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type HomeMenuItem = {
  label: string;
  icon: IconDefinition;
  url: string;
};

const HOME_MENU_ITEMS: HomeMenuItem[] = [
  { label: '출석 관리', icon: faCalendarCheck, url: '/attendance' },
  { label: '학생 관리', icon: faUserGraduate, url: '/students' },
  { label: '교사 정보', icon: faAddressBook, url: '/teachers' },
  { label: '연간 계획', icon: faCalendarDays, url: 'https://calendar.google.com/calendar/u/0/r' },
  {
    label: '회의록',
    icon: faClipboardList,
    url: 'https://www.notion.so/17a4a84007c58006857be3ab9ee8dc54?source=copy_link',
  },
  {
    label: '재정 관리',
    icon: faSackDollar,
    url: 'https://docs.google.com/spreadsheets/d/1Ya0NdpwoVj9i7eYvJHZ8ZYx6HZtwY2IRdgemHykMI-g/edit?usp=sharing',
  },
  {
    label: '자료 모음',
    icon: faFolderOpen,
    url: 'https://www.notion.so/17a4a84007c5808abeefd585825cd6c2?source=copy_link',
  },
  {
    label: '레크레이션',
    icon: faGamepad,
    url: '/recreation',
  },
  { label: '운영 관리', icon: faUsersGear, url: '/operations' },
];

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-[680px] rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="grid grid-cols-[repeat(2,minmax(140px,160px))] justify-center gap-4 md:grid-cols-[repeat(3,minmax(140px,160px))]">
          {HOME_MENU_ITEMS.map((item) => {
            const isExternal = item.url.startsWith('http');

            return (
              <Link
                key={item.label}
                href={item.url}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
                className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary-soft-hover)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              >
                <span className="inline-flex items-center justify-center rounded-xl text-[var(--color-text)] transition">
                  <FontAwesomeIcon icon={item.icon} className="h-10 w-10" />
                </span>
                <span className="text-sm font-semibold text-[var(--color-text)] sm:text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
