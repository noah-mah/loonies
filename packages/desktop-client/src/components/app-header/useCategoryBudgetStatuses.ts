import { useEffect, useState } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

import { useLocalPref } from '#hooks/useLocalPref';
import { useSpreadsheet } from '#hooks/useSpreadsheet';

import type { CategoryBudgetNumbers } from './categoryFilter';

type CellValue = string | number | boolean | null;

const FIELDS = ['leftover', 'goal', 'budget', 'long-goal'] as const;

type StatusField = 'leftover' | 'goal' | 'budgeted' | 'longGoal';

const FIELD_TO_STATUS: Record<(typeof FIELDS)[number], StatusField> = {
  leftover: 'leftover',
  goal: 'goal',
  budget: 'budgeted',
  'long-goal': 'longGoal',
};

function toNumber(value: CellValue): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function useCategoryBudgetStatuses(
  categoryIds: readonly string[],
  enabled: boolean,
): Record<string, CategoryBudgetNumbers> {
  const spreadsheet = useSpreadsheet();
  const [startMonthPref] = useLocalPref('budget.startMonth');
  const month = startMonthPref || monthUtils.currentMonth();
  const [statuses, setStatuses] = useState<
    Record<string, CategoryBudgetNumbers>
  >({});
  const categoryIdsKey = categoryIds.join('\n');

  useEffect(() => {
    if (!enabled || categoryIdsKey === '') {
      return;
    }

    const ids = categoryIdsKey.split('\n');
    const sheetName = monthUtils.sheetForMonth(month);
    const unsubscribes: Array<() => void> = [];

    function store(
      categoryId: string,
      field: StatusField,
      value: number | null,
    ) {
      setStatuses(current => {
        const previous = current[categoryId] ?? {
          loaded: false,
          leftover: null,
          goal: null,
          budgeted: null,
          longGoal: null,
        };

        if (previous.loaded && previous[field] === value) {
          return current;
        }

        return {
          ...current,
          [categoryId]: {
            ...previous,
            loaded: true,
            [field]: value,
          },
        };
      });
    }

    for (const categoryId of ids) {
      for (const field of FIELDS) {
        const statusField = FIELD_TO_STATUS[field];
        unsubscribes.push(
          spreadsheet.bind(sheetName, `${field}-${categoryId}`, node => {
            store(categoryId, statusField, toNumber(node.value));
          }),
        );
      }
    }

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }, [categoryIdsKey, enabled, month, spreadsheet]);

  if (!enabled) {
    return {};
  }

  return statuses;
}
