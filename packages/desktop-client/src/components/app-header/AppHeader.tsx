import { useRef, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCog,
  SvgReports,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgArrowsSynchronize } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { getSidebarMenuItemPath } from '#components/sidebar/sidebarMenu';
import { hasMacOSWindowButtons } from '#components/sidebar/SidebarShell';
import { useNavigate } from '#hooks/useNavigate';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

import { appPageForPath } from './appPages';
import type { AppPageId } from './appPages';
import { useBudgetCategoryFilter } from './BudgetCategoryFilterContext';
import { BUDGET_CATEGORY_FILTERS } from './categoryFilter';
import type { BudgetCategoryFilter } from './categoryFilter';

const PAGE_ICONS: Record<AppPageId, ComponentType<SVGProps<SVGSVGElement>>> = {
  budget: SvgWallet,
  reports: SvgReports,
  automations: SvgArrowsSynchronize,
  settings: SvgCog,
};

const triggerClassName = css({
  gap: 4,
  height: 28,
  minHeight: 0,
  padding: '4px 8px',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: theme.pageTextSubdued,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  '&[data-hovered]': {
    backgroundColor: theme.sidebarItemBackgroundHover,
    color: theme.pageTextSubdued,
  },
  '&[data-pressed]': {
    backgroundColor: theme.sidebarItemBackgroundHover,
  },
});

const menuItemClassName = css({
  justifyContent: 'flex-start',
  gap: 4,
  width: '100%',
  height: 20,
  minHeight: 0,
  padding: 0,
  borderRadius: 4,
  backgroundColor: 'transparent',
  color: theme.pageTextSubdued,
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '18px',
  '&[data-hovered]': {
    backgroundColor: 'transparent',
    color: theme.pageText,
  },
});

const currentMenuItemClassName = css({
  color: theme.pageText,
  fontWeight: 500,
  '&[data-hovered]': {
    color: theme.pageText,
  },
});

const selectedFilterClassName = css({
  backgroundColor: theme.cardBackground,
  color: theme.pageText,
  border: `1px solid ${theme.cardBackground}`,
  boxShadow: '0 0 3px rgba(0, 0, 0, 0.1)',
  '&[data-hovered]': {
    backgroundColor: theme.cardBackground,
    color: theme.pageText,
  },
});

type PageDestination = {
  id: AppPageId;
  path: string;
  label: string;
};

export function AppHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarItems } = useSidebarMenu();
  const { filter, setFilter } = useBudgetCategoryFilter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const schedulesInSidebar = sidebarItems.some(item => item.id === 'schedules');
  const currentPage = appPageForPath(location.pathname);
  const showFilters = currentPage === 'budget';

  const pages: PageDestination[] = [
    { id: 'budget', path: '/budget', label: t('Budget') },
    { id: 'reports', path: '/reports', label: t('Reports') },
    {
      id: 'automations',
      path: getSidebarMenuItemPath('schedules', schedulesInSidebar),
      label: t('Automations'),
    },
    { id: 'settings', path: '/settings', label: t('Settings') },
  ];

  const currentLabel =
    pages.find(page => page.id === currentPage)?.label ?? t('Switch page');
  const CurrentIcon = currentPage ? PAGE_ICONS[currentPage] : SvgWallet;

  const filterLabels: Record<BudgetCategoryFilter, string> = {
    all: t('All Categories'),
    overspent: t('Overspent'),
    underfunded: t('Underfunded'),
    overfunded: t('Overfunded'),
    available: t('Available'),
  };

  function onSelectPage(page: PageDestination) {
    setIsMenuOpen(false);
    void navigate(page.path);
  }

  return (
    <View
      data-testid="app-header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 45,
        flexShrink: 0,
        paddingLeft: hasMacOSWindowButtons() ? 80 : 12,
        paddingRight: 12,
        backgroundColor: theme.sidebarBackground,
        borderBottom: `1px solid ${theme.sidebarBorder}`,
        WebkitAppRegion: 'drag',
      }}
    >
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Switch page')}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        data-testid="app-header-page-menu"
        className={triggerClassName}
        onPress={() => setIsMenuOpen(!isMenuOpen)}
      >
        <CurrentIcon width={16} height={16} style={{ color: theme.pageText }} />
        <Text style={{ color: 'inherit', fontWeight: 500 }}>
          {currentLabel}
        </Text>
        <SvgCheveronDown
          width={16}
          height={16}
          style={{ color: theme.pageTextSubdued }}
        />
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        offset={6}
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        style={{
          padding: 8,
          borderRadius: 6,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.cardBackground,
          backgroundColor: theme.cardBackground,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <View role="menu" style={{ gap: 8 }}>
          {pages.map(page => {
            const Icon = PAGE_ICONS[page.id];
            const isCurrent = page.id === currentPage;

            return (
              <Button
                key={page.id}
                variant="bare"
                data-testid={`app-header-page-${page.id}`}
                className={cx(
                  menuItemClassName,
                  isCurrent && currentMenuItemClassName,
                )}
                onPress={() => onSelectPage(page)}
              >
                <Icon width={16} height={16} />
                <Text style={{ color: 'inherit', fontWeight: 'inherit' }}>
                  {page.label}
                </Text>
              </Button>
            );
          })}
        </View>
      </Popover>

      <View
        style={{
          width: 1,
          height: 20,
          flexShrink: 0,
          backgroundColor: theme.sidebarBorder,
        }}
      />

      {showFilters &&
        BUDGET_CATEGORY_FILTERS.map(filterId => {
          const isSelected = filter === filterId;

          return (
            <Button
              key={filterId}
              variant="bare"
              aria-pressed={isSelected}
              data-testid={`app-header-filter-${filterId}`}
              className={cx(
                triggerClassName,
                isSelected && selectedFilterClassName,
              )}
              onPress={() => setFilter(filterId)}
            >
              <Text style={{ color: 'inherit', fontWeight: 500 }}>
                {filterLabels[filterId]}
              </Text>
            </Button>
          );
        })}
    </View>
  );
}
