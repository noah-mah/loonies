import { useTranslation } from 'react-i18next';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useMoveCategoryGroupMutation } from '#budget';
import { ReorderableList } from '#components/reorderable/ReorderableList';
import type { DropPosition } from '#components/sort';

import { ExpenseGroupListItem } from './ExpenseGroupListItem';

type ExpenseGroupListProps = {
  categoryGroups: CategoryGroupEntity[];
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  month: string;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  showHiddenCategories: boolean;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function ExpenseGroupList({
  categoryGroups,
  show3Columns,
  showBudgetedColumn,
  month,
  onEditCategoryGroup,
  onEditCategory,
  onBudgetAction,
  showHiddenCategories,
  isCollapsed,
  onToggleCollapse,
}: ExpenseGroupListProps) {
  const { t } = useTranslation();
  const moveCategoryGroup = useMoveCategoryGroupMutation();

  const onMove = (
    draggedId: string,
    targetId: string,
    position: DropPosition,
  ) => {
    if (position === 'top') {
      moveCategoryGroup.mutate({ id: draggedId, targetId });
      return;
    }
    const targetGroupIndex = categoryGroups.findIndex(
      group => group.id === targetId,
    );
    if (targetGroupIndex === -1) return;
    // moveCategoryGroup inserts before the target, so the following group
    // places this one after the row that was dropped on. A missing follower
    // moves the group to the end.
    const nextToTargetCategory = categoryGroups[targetGroupIndex + 1];
    moveCategoryGroup.mutate({
      id: draggedId,
      targetId: nextToTargetCategory?.id || null,
    });
  };

  return (
    <ReorderableList
      label={t('Expense category groups')}
      dragType="expense-group"
      itemIds={categoryGroups.map(group => group.id)}
      onMove={onMove}
    >
      {categoryGroups.map(categoryGroup => (
        <ExpenseGroupListItem
          key={categoryGroup.id}
          value={categoryGroup}
          month={month}
          onEditCategoryGroup={onEditCategoryGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          showHiddenCategories={showHiddenCategories}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isHidden={!!categoryGroup.hidden}
        />
      ))}
    </ReorderableList>
  );
}
