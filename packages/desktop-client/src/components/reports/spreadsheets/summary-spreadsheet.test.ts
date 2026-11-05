import * as d from 'date-fns';
import { describe, expect, it } from 'vitest';

import { calculatePerMonth } from './summary-spreadsheet';

describe('calculatePerMonth', () => {
  it('uses fractional months for the current partial month', () => {
    const start = d.parse('2026-01-01', 'yyyy-MM-dd', new Date());
    const end = d.parse('2026-11-05', 'yyyy-MM-dd', new Date());
    const months = [start];
    let current = d.addMonths(d.startOfMonth(start), 1);
    while (!d.isSameMonth(current, end)) {
      months.push(current);
      current = d.addMonths(current, 1);
    }
    months.push(end);

    const result = calculatePerMonth(
      [{ date: '2026-11-05', amount: -4000, count: 1 }],
      months,
    );

    expect(result.dividend).toBe(-4000);
    expect(result.divisor).toBeCloseTo(10 + 5 / 30, 5);
    expect(result.total).toBeCloseTo(-4000 / (10 + 5 / 30), 0);
  });

  it('returns zero when there is no data', () => {
    expect(calculatePerMonth([], [new Date()])).toEqual({
      total: 0,
      dividend: 0,
      divisor: 0,
    });
  });
});
