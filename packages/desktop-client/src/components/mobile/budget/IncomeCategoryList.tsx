import { useTranslation } from 'react-i18next';

import type { CategoryEntity } from '@actual-app/core/types/models';

import { useMoveCategoryMutation } from '#budget';
import { ReorderableList } from '#components/reorderable/ReorderableList';
import type { DropPosition } from '#components/sort';

import { IncomeCategoryListItem } from './IncomeCategoryListItem';

type IncomeCategoryListProps = {
  categories: CategoryEntity[];
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function IncomeCategoryList({
  categories,
  month,
  onEditCategory,
  onBudgetAction,
}: IncomeCategoryListProps) {
  const { t } = useTranslation();
  const moveCategory = useMoveCategoryMutation();

  const onMove = (
    draggedId: string,
    targetId: string,
    position: DropPosition,
  ) => {
    const categoryToMove = categories.find(
      category => category.id === draggedId,
    );
    if (categoryToMove?.group == null) return;
    if (position === 'top') {
      moveCategory.mutate({
        id: categoryToMove.id,
        groupId: categoryToMove.group,
        targetId,
      });
      return;
    }
    const targetCategoryIndex = categories.findIndex(
      category => category.id === targetId,
    );
    if (targetCategoryIndex === -1) return;
    // moveCategory inserts before the target, so the following category
    // places this one after the row that was dropped on.
    const nextToTargetCategory = categories[targetCategoryIndex + 1];
    moveCategory.mutate({
      id: categoryToMove.id,
      groupId: categoryToMove.group,
      targetId: nextToTargetCategory?.id || null,
    });
  };

  return (
    <ReorderableList
      label={t('Income categories')}
      dragType="income-category"
      itemIds={categories.map(category => category.id)}
      onMove={onMove}
    >
      {categories.map(category => (
        <IncomeCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEdit={onEditCategory}
          onBudgetAction={onBudgetAction}
        />
      ))}
    </ReorderableList>
  );
}
