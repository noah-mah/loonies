import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { css } from '@actual-app/components/css';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';

import {
  ReorderableItem,
  ReorderHandle,
} from '#components/reorderable/ReorderableList';
import { isTransactionTableColumnLocked } from '#components/transactions/table/columns';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from '#components/transactions/table/columns';

type TransactionTableColumnListItemProps = {
  column: TransactionTableColumn;
  label: string;
  onToggle: (id: TransactionTableColumnId, isVisible: boolean) => void;
};

export function TransactionTableColumnListItem({
  column,
  label,
  onToggle,
}: TransactionTableColumnListItemProps) {
  const { t } = useTranslation();
  const isLocked = isTransactionTableColumnLocked(column.id);

  return (
    <ReorderableItem
      id={column.id}
      textValue={label}
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        marginBottom: 4,
        borderRadius: 6,
        border: '1px solid ' + theme.tableBorder,
        backgroundColor: theme.tableBackground,
        '&:hover': {
          backgroundColor: theme.tableRowBackgroundHover,
        },
        '&:focus-visible': {
          boxShadow: '0 0 0 2px ' + theme.formInputBorderSelected,
        },
      })}
    >
      <ReorderHandle
        itemId={column.id}
        label={t('Reorder {{ columnName }} column', { columnName: label })}
      />
      <Text
        style={{
          flex: 1,
          color: column.hidden ? theme.pageTextSubdued : theme.tableText,
        }}
      >
        {label}
      </Text>
      {isLocked ? (
        <Text
          size="small"
          style={{
            color: theme.pageTextSubdued,
            fontStyle: 'italic',
          }}
        >
          <Trans>Always shown</Trans>
        </Text>
      ) : (
        <Toggle
          id={`toggle-column-${column.id}`}
          aria-label={label}
          isOn={!column.hidden}
          onToggle={isVisible => onToggle(column.id, isVisible)}
        />
      )}
    </ReorderableItem>
  );
}
