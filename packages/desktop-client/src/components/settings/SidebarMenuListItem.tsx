import type { ComponentType, SVGProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { css } from '@actual-app/components/css';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';

import {
  ReorderableItem,
  ReorderHandle,
} from '#components/reorderable/ReorderableList';
import { isSidebarMenuItemLocked } from '#components/sidebar/sidebarMenu';
import type {
  SidebarMenuItem,
  SidebarMenuItemId,
} from '#components/sidebar/sidebarMenu';

type SidebarMenuListItemProps = {
  item: SidebarMenuItem;
  label: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  isStartPage: boolean;
  onToggle: (id: SidebarMenuItemId, isVisible: boolean) => void;
};

export function SidebarMenuListItem({
  item,
  label,
  Icon,
  isStartPage,
  onToggle,
}: SidebarMenuListItemProps) {
  const { t } = useTranslation();

  return (
    <ReorderableItem
      id={item.id}
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
        itemId={item.id}
        label={t('Reorder {{ pageName }}', { pageName: label })}
      />
      <Icon
        width={14}
        height={14}
        style={{
          flexShrink: 0,
          color: item.hidden ? theme.pageTextSubdued : theme.tableText,
        }}
      />
      <Text
        style={{
          flex: 1,
          color: item.hidden ? theme.pageTextSubdued : theme.tableText,
        }}
      >
        {label}
      </Text>
      {isStartPage && (
        <Text size="small" style={{ color: theme.pageTextSubdued }}>
          <Trans>Start page</Trans>
        </Text>
      )}
      {isSidebarMenuItemLocked(item.id) ? (
        <Text
          size="small"
          style={{ color: theme.pageTextSubdued, fontStyle: 'italic' }}
        >
          <Trans>Always shown</Trans>
        </Text>
      ) : (
        <Toggle
          id={`toggle-sidebar-item-${item.id}`}
          aria-label={label}
          isOn={!item.hidden}
          onToggle={isVisible => onToggle(item.id, isVisible)}
        />
      )}
    </ReorderableItem>
  );
}
