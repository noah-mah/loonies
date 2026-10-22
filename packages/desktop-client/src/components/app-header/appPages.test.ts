import { appPageForPath } from './appPages';

describe('appPageForPath', () => {
  it('maps the budget page', () => {
    expect(appPageForPath('/budget')).toBe('budget');
  });

  it('maps reports, including nested dashboards', () => {
    expect(appPageForPath('/reports')).toBe('reports');
    expect(appPageForPath('/reports/dashboard-1')).toBe('reports');
  });

  it('maps schedules to automations, including when they live under settings', () => {
    expect(appPageForPath('/schedules')).toBe('automations');
    expect(appPageForPath('/schedules/abc')).toBe('automations');
    expect(appPageForPath('/settings/schedules')).toBe('automations');
  });

  it('maps the rest of settings', () => {
    expect(appPageForPath('/settings')).toBe('settings');
    expect(appPageForPath('/settings/general')).toBe('settings');
  });

  it('returns null for pages outside the header switcher', () => {
    expect(appPageForPath('/accounts')).toBeNull();
    expect(appPageForPath('/accounts/checking')).toBeNull();
  });
});
