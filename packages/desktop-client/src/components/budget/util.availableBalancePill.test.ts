import { theme } from '@actual-app/components/theme';
import { describe, expect, it } from 'vitest';

import { makeAvailableBalancePillStyle } from './util';

describe('makeAvailableBalancePillStyle', () => {
  it('uses the positive pill tokens for surplus available amounts', () => {
    expect(makeAvailableBalancePillStyle(12345)).toEqual({
      backgroundColor: theme.availableBalancePillPositiveBackground,
      color: theme.availableBalancePillPositiveText,
    });
  });

  it('uses the zero pill tokens for empty available amounts', () => {
    expect(makeAvailableBalancePillStyle(0)).toEqual({
      backgroundColor: theme.availableBalancePillZeroBackground,
      color: theme.availableBalancePillZeroText,
    });
    expect(makeAvailableBalancePillStyle(null)).toEqual({
      backgroundColor: theme.availableBalancePillZeroBackground,
      color: theme.availableBalancePillZeroText,
    });
  });

  it('uses the negative pill tokens for overspent available amounts', () => {
    expect(makeAvailableBalancePillStyle(-500)).toEqual({
      backgroundColor: theme.availableBalancePillNegativeBackground,
      color: theme.availableBalancePillNegativeText,
    });
  });
});
