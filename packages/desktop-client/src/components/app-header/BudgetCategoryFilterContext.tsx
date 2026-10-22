import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import type { BudgetCategoryFilter } from './categoryFilter';

type BudgetCategoryFilterContextValue = {
  filter: BudgetCategoryFilter;
  setFilter: (filter: BudgetCategoryFilter) => void;
};

const BudgetCategoryFilterContext =
  createContext<BudgetCategoryFilterContextValue | null>(null);

type BudgetCategoryFilterProviderProps = {
  children: ReactNode;
};

export function BudgetCategoryFilterProvider({
  children,
}: BudgetCategoryFilterProviderProps) {
  const [filter, setFilter] = useState<BudgetCategoryFilter>('all');

  return (
    <BudgetCategoryFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </BudgetCategoryFilterContext.Provider>
  );
}

export function useBudgetCategoryFilter(): BudgetCategoryFilterContextValue {
  const context = useContext(BudgetCategoryFilterContext);

  if (!context) {
    return {
      filter: 'all',
      setFilter: () => undefined,
    };
  }

  return context;
}
