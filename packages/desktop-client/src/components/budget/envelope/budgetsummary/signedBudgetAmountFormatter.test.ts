import { describe, expect, it } from 'vitest';

import type { useFormat } from '#hooks/useFormat';

import { makeSignedBudgetAmountFormatter } from './signedBudgetAmountFormatter';

describe('makeSignedBudgetAmountFormatter', () => {
  const format = ((value: number) => value.toFixed(2)) as ReturnType<
    typeof useFormat
  >;

  it('does not prefix zero with a minus sign', () => {
    const signed = makeSignedBudgetAmountFormatter(format);
    expect(signed(0)).toBe('0.00');
    expect(signed(-0)).toBe('0.00');
  });

  it('prefixes non-zero values with explicit signs', () => {
    const signed = makeSignedBudgetAmountFormatter(format);
    expect(signed(25)).toBe('+25.00');
    expect(signed(-25)).toBe('-25.00');
  });

  it('inverts signs for non-zero values', () => {
    const inverted = makeSignedBudgetAmountFormatter(format, true);
    expect(inverted(0)).toBe('0.00');
    expect(inverted(25)).toBe('-25.00');
    expect(inverted(-25)).toBe('+25.00');
  });
});
