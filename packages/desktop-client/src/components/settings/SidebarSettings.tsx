import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { css } from '@actual-app/components/css';
import { Select } from '@actual-app/components/select';

import { ReorderableList } from '#components/reorderable/ReorderableList';
import {
  getDefaultSidebarMenuItems,
  moveSidebarMenuItem,
  parseSidebarStartPage,
} from '#components/sidebar/sidebarMenu';
import type { SidebarMenuItemId } from '#components/sidebar/sidebarMenu';
import { useSidebarMenuItemDetails } from '#components/sidebar/useSidebarMenuItemDetails';
import type { DropPosition } from '#components/sort';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SidebarMenuListItem } from './SidebarMenuListItem';

export function SidebarSettings() {
  const { t } = useTranslation();
  const itemDetails = useSidebarMenuItemDetails();
  const { items, availableItems, startPage, saveItems, saveStartPage } =
    useSidebarMenu();

  const onToggleItem = (id: SidebarMenuItemId, isVisible: boolean) => {
    saveItems(
      items.map(item =>
        item.id === id ? { ...item, hidden: !isVisible } : item,
      ),
    );
  };

  const onResetToDefault = () => {
    const defaultItems = getDefaultSidebarMenuItems();
    saveItems(defaultItems);
    saveStartPage(parseSidebarStartPage(undefined, defaultItems));
  };

  const onMove = (
    draggedId: string,
    targetId: string,
    position: DropPosition,
  ) => {
    saveItems(
      moveSidebarMenuItem(
        items,
        draggedId,
        targetId,
        position === 'bottom' ? 'after' : 'before',
      ),
    );
  };

  return (
    <SettingsGroup title={t('Sidebar')}>
      <SettingsRow
        title={t('Pages')}
        description={t(
          'Choose which pages appear in the sidebar and drag them into the order you prefer. Pages you switch off can be found here in Settings.',
        )}
        control={
          <Button variant="bare" onPress={onResetToDefault}>
            <Trans>Reset to default</Trans>
          </Button>
        }
      >
        <ReorderableList
          label={t('Sidebar pages')}
          dragType="sidebar-menu-item"
          itemIds={availableItems.map(item => item.id)}
          onMove={onMove}
          className={css({ display: 'flex', flexDirection: 'column' })}
        >
          {availableItems.map(item => (
            <SidebarMenuListItem
              key={item.id}
              item={item}
              label={itemDetails[item.id].title}
              Icon={itemDetails[item.id].Icon}
              isStartPage={item.id === startPage}
              onToggle={onToggleItem}
            />
          ))}
        </ReorderableList>
      </SettingsRow>
      <SettingsRow
        title={t('Start page')}
        description={t("Actual's home page.")}
        htmlFor="settings-sidebarStartPage"
        control={
          <Select
            id="settings-sidebarStartPage"
            value={startPage}
            onChange={saveStartPage}
            options={availableItems.map(item => [
              item.id,
              itemDetails[item.id].title,
            ])}
          />
        }
      />
    </SettingsGroup>
  );
}
