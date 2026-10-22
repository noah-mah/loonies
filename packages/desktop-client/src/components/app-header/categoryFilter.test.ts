import { categoryMatchesFilter } from './categoryFilter';
import type { CategoryBudgetNumbers } from './categoryFilter';

const funded: CategoryBudgetNumbers = {
  loaded: true,
  leftover: 2000,
  goal: 5000,
  budgeted: 5000,
  longGoal: 0,
};

describe('categoryMatchesFilter', () => {
  it('keeps every category on All Categories', () => {
    expect(
      categoryMatchesFilter('all', {
        loaded: true,
        leftover: 0,
        goal: null,
        budgeted: 0,
        longGoal: null,
      }),
    ).toBe(true);
  });

  it('keeps a category until its balance has loaded', () => {
    expect(
      categoryMatchesFilter('overspent', {
        loaded: false,
        leftover: null,
        goal: null,
        budgeted: null,
        longGoal: null,
      }),
    ).toBe(true);
  });

  it('matches overspent and available from the leftover balance', () => {
    expect(
      categoryMatchesFilter('overspent', { ...funded, leftover: -100 }),
    ).toBe(true);
    expect(categoryMatchesFilter('overspent', funded)).toBe(false);
    expect(categoryMatchesFilter('available', funded)).toBe(true);
    expect(categoryMatchesFilter('available', { ...funded, leftover: 0 })).toBe(
      false,
    );
  });

  it('matches underfunded and overfunded against the monthly goal', () => {
    expect(
      categoryMatchesFilter('underfunded', { ...funded, budgeted: 1000 }),
    ).toBe(true);
    expect(
      categoryMatchesFilter('overfunded', { ...funded, budgeted: 8000 }),
    ).toBe(true);
    expect(categoryMatchesFilter('underfunded', funded)).toBe(false);
  });

  it('uses the balance for long-term goals', () => {
    expect(
      categoryMatchesFilter('underfunded', {
        loaded: true,
        leftover: 1000,
        goal: 5000,
        budgeted: 5000,
        longGoal: 1,
      }),
    ).toBe(true);
  });

  it('ignores categories that have no goal', () => {
    expect(
      categoryMatchesFilter('underfunded', {
        loaded: true,
        leftover: -100,
        goal: null,
        budgeted: 0,
        longGoal: null,
      }),
    ).toBe(false);
  });

  it('hides a category once its balance cell comes back empty', () => {
    expect(
      categoryMatchesFilter('overspent', {
        loaded: true,
        leftover: null,
        goal: null,
        budgeted: null,
        longGoal: null,
      }),
    ).toBe(false);
  });
});
