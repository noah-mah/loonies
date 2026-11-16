import { useTranslation } from 'react-i18next';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useReorderCategoryMutation } from '#budget';
import { findSortDown } from '#components/budget/util';
import { ReorderableList } from '#components/reorderable/ReorderableList';
import type { DropPosition } from '#components/sort';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

type ExpenseCategoryListProps = {
  categoryGroup: CategoryGroupEntity;
  categories: CategoryEntity[];
  shouldHideCategory: (category: CategoryEntity) => boolean;
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

export function ExpenseCategoryList({
  categoryGroup,
  categories,
  month,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  shouldHideCategory,
}: ExpenseCategoryListProps) {
  const { t } = useTranslation();
  const reorderCategory = useReorderCategoryMutation();

  const onMove = (
    categoryId: string,
    targetId: string,
    position: DropPosition,
  ) => {
    reorderCategory.mutate({
      id: categoryId,
      groupId: categoryGroup.id,
      ...findSortDown(categories, position, targetId),
    });
  };

  return (
    <ReorderableList
      label={t('{{categoryGroupName}} expense group categories', {
        categoryGroupName: categoryGroup.name,
      })}
      dragType="expense-category"
      itemIds={categories.map(category => category.id)}
      onMove={onMove}
    >
      {categories.map(category => (
        <ExpenseCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          isHidden={shouldHideCategory(category)}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
      ))}
    </ReorderableList>
  );
}
