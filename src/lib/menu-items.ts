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

import type { TeacherRole } from '@/types/teacher';

export type MenuItem = {
  label: string;
  icon: IconDefinition;
  url: string;
};

const COMMON_MENU_ITEMS: MenuItem[] = [
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
  { label: '레크레이션', icon: faGamepad, url: '/recreation' },
];

const ADMIN_ONLY_MENU_ITEM: MenuItem = {
  label: '가입 관리',
  icon: faUsersGear,
  url: '/signup-management',
};

/**
 * 사용자 권한에 맞는 메뉴 목록을 반환한다.
 */
export function getMenuItemsByRole(role: TeacherRole | undefined): MenuItem[] {
  if (role === 'ADMIN') {
    return [...COMMON_MENU_ITEMS, ADMIN_ONLY_MENU_ITEM];
  }

  return COMMON_MENU_ITEMS;
}
