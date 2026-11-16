import { describe, expect, it } from 'vitest';

import { shouldUseCossDarkClass } from './theme';

describe('shouldUseCossDarkClass', () => {
  it('follows an explicit light or dark choice', () => {
    expect(shouldUseCossDarkClass('light', 'dark')).toBe(false);
    expect(shouldUseCossDarkClass('dark', 'light')).toBe(true);
  });

  it('follows the system scheme when the preference is auto', () => {
    expect(shouldUseCossDarkClass('auto', 'dark')).toBe(true);
    expect(shouldUseCossDarkClass('auto', 'light')).toBe(false);
  });
});
