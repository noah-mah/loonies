import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgCalendar,
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css, cx } from '@emotion/css';

import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocale } from '#hooks/useLocale';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { highlightedMonthSlice } from './highlightedMonthSlice';
import type { MonthBounds } from './MonthsContext';

const MAX_MONTHS = 2;

const sideButtonClassName = css({
  gap: 4,
  height: 28,
  minHeight: 0,
  padding: '4px 8px',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: theme.pageText,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  '&[data-hovered]': {
    backgroundColor: theme.sidebarItemBackgroundHover,
    color: theme.pageText,
  },
});

const newTransactionClassName = css({
  gap: 4,
  height: 34,
  minHeight: 0,
  padding: 8,
  borderRadius: 6,
  backgroundColor: theme.sidebarControlBackground,
  color: theme.pageText,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  '&[data-hovered]': {
    backgroundColor: theme.tableRowBackgroundHover,
    color: theme.pageText,
  },
});

const monthButtonClassName = css({
  minHeight: 0,
  height: 18,
  padding: 0,
  backgroundColor: 'transparent',
  color: theme.pageTextSubdued,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  '&[data-hovered]': {
    backgroundColor: 'transparent',
    color: theme.pageText,
  },
});

const selectedMonthClassName = css({
  color: theme.pageText,
  '&[data-hovered]': {
    color: theme.pageText,
  },
});

type BudgetMonthToolbarProps = {
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  onMonthSelect: (month: string) => void;
};

export function BudgetMonthToolbar({
  startMonth,
  numMonths,
  monthBounds,
  onMonthSelect,
}: BudgetMonthToolbarProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [maxMonthsPref, setMaxMonthsPref] = useGlobalPref('maxMonths');
  const monthCount = Math.min(maxMonthsPref || 1, MAX_MONTHS);
  const viewButtonRef = useRef<HTMLButtonElement>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <View
      data-testid="budget-month-toolbar"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        padding: '16px 12px',
        borderBottom: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Button
          ref={viewButtonRef}
          variant="bare"
          aria-label={t('Budget view')}
          aria-haspopup="menu"
          aria-expanded={isViewOpen}
          data-testid="budget-view-menu"
          className={sideButtonClassName}
          onPress={() => setIsViewOpen(!isViewOpen)}
        >
          <SvgCalendar width={16} height={16} />
          <Text style={{ color: 'inherit', fontWeight: 500 }}>
            <span>
              <Trans>View</Trans>
            </span>
          </Text>
        </Button>
        <Popover
          triggerRef={viewButtonRef}
          placement="bottom start"
          offset={6}
          isOpen={isViewOpen}
          onOpenChange={setIsViewOpen}
          style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: theme.cardBackground,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <View role="menu" style={{ gap: 4 }}>
            {[1, 2].map(count => (
              <Button
                key={count}
                variant="bare"
                data-testid={`budget-view-${count}`}
                className={cx(
                  sideButtonClassName,
                  count === monthCount &&
                    css({ backgroundColor: theme.sidebarControlBackground }),
                )}
                onPress={() => {
                  setMaxMonthsPref(count);
                  setIsViewOpen(false);
                }}
              >
                <Text style={{ color: 'inherit', fontWeight: 500 }}>
                  {count === 1 ? t('1 month') : t('2 months')}
                </Text>
              </Button>
            ))}
          </View>
        </Popover>
      </View>

      <BudgetMonthStrip
        startMonth={startMonth}
        numMonths={numMonths}
        monthBounds={monthBounds}
        onMonthSelect={onMonthSelect}
      />

      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Button
          variant="bare"
          data-testid="budget-new-transaction"
          className={newTransactionClassName}
          onPress={() => {
            dispatch(
              pushModal({ modal: { name: 'choose-transaction-account' } }),
            );
          }}
        >
          <Text style={{ color: 'inherit', fontWeight: 500 }}>
            <Trans>New transaction</Trans>
          </Text>
          <SvgAdd width={16} height={16} />
        </Button>
      </View>
    </View>
  );
}

type BudgetMonthStripProps = {
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  onMonthSelect: (month: string) => void;
};

function BudgetMonthStrip({
  startMonth,
  numMonths,
  monthBounds,
  onMonthSelect,
}: BudgetMonthStripProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lastSelectedMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const range = monthUtils.rangeInclusive(
    monthUtils.subMonths(startMonth, 6),
    monthUtils.addMonths(lastSelectedMonth, 6),
  );
  const firstSelectedIndex = range.indexOf(startMonth);
  const highlightStart = hoverIndex ?? firstSelectedIndex;
  const { before, highlighted, after } = highlightedMonthSlice(
    range,
    highlightStart,
    numMonths,
  );

  function monthLabel(month: string) {
    return monthUtils.format(month, 'MMM', locale);
  }

  function renderMonth(month: string, index: number, isHighlighted: boolean) {
    const isBudgeted = month >= monthBounds.start && month <= monthBounds.end;

    return (
      <Button
        key={month}
        variant="bare"
        data-testid={isHighlighted ? 'selected-budget-month' : undefined}
        data-month={isHighlighted ? month : undefined}
        className={cx(
          monthButtonClassName,
          isHighlighted && selectedMonthClassName,
        )}
        style={{
          textDecoration: isBudgeted ? undefined : 'line-through',
        }}
        onPress={() => onMonthSelect(month)}
        onHoverStart={() => setHoverIndex(index)}
        onHoverEnd={() => setHoverIndex(null)}
      >
        {monthLabel(month)}
      </Button>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Button
        variant="bare"
        aria-label={t('Previous month')}
        className={monthButtonClassName}
        onPress={() => onMonthSelect(monthUtils.prevMonth(startMonth))}
      >
        <SvgCheveronLeft width={16} height={16} />
      </Button>
      {before.map((month, index) => renderMonth(month, index, false))}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 4,
          borderRadius: 4,
          backgroundColor: theme.cardBackground,
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        {highlighted.map((month, index) =>
          renderMonth(month, before.length + index, true),
        )}
      </View>
      {after.map((month, index) =>
        renderMonth(month, before.length + highlighted.length + index, false),
      )}
      <Button
        variant="bare"
        aria-label={t('Next month')}
        className={monthButtonClassName}
        onPress={() => onMonthSelect(monthUtils.nextMonth(startMonth))}
      >
        <SvgCheveronRight width={16} height={16} />
      </Button>
    </View>
  );
}
