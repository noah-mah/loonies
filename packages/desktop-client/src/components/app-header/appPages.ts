export const APP_PAGE_IDS = [
  'budget',
  'reports',
  'automations',
  'settings',
] as const;

export type AppPageId = (typeof APP_PAGE_IDS)[number];

export function appPageForPath(pathname: string): AppPageId | null {
  if (pathname === '/budget' || pathname.startsWith('/budget/')) {
    return 'budget';
  }

  if (pathname === '/reports' || pathname.startsWith('/reports/')) {
    return 'reports';
  }

  if (
    pathname === '/schedules' ||
    pathname.startsWith('/schedules/') ||
    pathname === '/settings/schedules' ||
    pathname.startsWith('/settings/schedules/')
  ) {
    return 'automations';
  }

  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return 'settings';
  }

  return null;
}
