export const BUDGET_CATEGORY_FILTERS = [
  'all',
  'overspent',
  'underfunded',
  'overfunded',
  'available',
] as const;

export type BudgetCategoryFilter = (typeof BUDGET_CATEGORY_FILTERS)[number];

export type CategoryBudgetNumbers = {
  loaded: boolean;
  leftover: number | null;
  goal: number | null;
  budgeted: number | null;
  longGoal: number | null;
};

export const EMPTY_CATEGORY_BUDGET_NUMBERS: CategoryBudgetNumbers = {
  loaded: false,
  leftover: null,
  goal: null,
  budgeted: null,
  longGoal: null,
};

export function categoryMatchesFilter(
  filter: BudgetCategoryFilter,
  status: CategoryBudgetNumbers,
): boolean {
  if (filter === 'all') {
    return true;
  }

  // Keep the row only until the first cell response. A missing balance
  // does not match a status filter.
  if (!status.loaded) {
    return true;
  }

  if (status.leftover === null) {
    return false;
  }

  if (filter === 'overspent') {
    return status.leftover < 0;
  }

  if (filter === 'available') {
    return status.leftover > 0;
  }

  if (status.goal === null || status.goal === 0) {
    return false;
  }

  const budgeted = status.budgeted ?? 0;
  const have = status.longGoal === 1 ? status.leftover : budgeted;

  if (filter === 'underfunded') {
    return have < status.goal;
  }

  return have > status.goal;
}
