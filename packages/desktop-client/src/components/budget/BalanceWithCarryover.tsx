// @ts-strict-ignore
import React, { useCallback } from 'react';
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
} from 'react';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

import { GoalStatus } from './GoalStatus';
import {
  availableBalancePillChrome,
  makeAvailableBalancePillStyle,
  makeBalanceAmountStyle,
} from './util';

type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

export function CarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        marginLeft: 2,
        position: 'absolute',
        right: '-4px',
        alignSelf: 'center',
        justifyContent: 'center',
        top: 0,
        bottom: 0,
        ...style,
      }}
    >
      <SvgArrowThinRight
        width={style?.width || 7}
        height={style?.height || 7}
        style={style}
      />
    </View>
  );
}

type CellValueChildren = ComponentPropsWithoutRef<typeof CellValue>['children'];

type ChildrenWithClassName = (
  props: Parameters<CellValueChildren>[0] & {
    className: string;
  },
) => ReturnType<CellValueChildren>;

type BalanceWithCarryoverProps = Omit<
  ComponentPropsWithoutRef<typeof CellValue>,
  'children' | 'binding'
> & {
  children?: ChildrenWithClassName;
  carryover: Binding<'envelope-budget' | 'tracking-budget', 'carryover'>;
  /**
   * Expense category balance binding is `leftover`,
   * while income category balance binding is `sum-amount`.
   */
  balance: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  goal: Binding<'envelope-budget' | 'tracking-budget', 'goal'>;
  budgeted: Binding<'envelope-budget' | 'tracking-budget', 'budget'>;
  longGoal: Binding<'envelope-budget' | 'tracking-budget', 'long-goal'>;
  isDisabled?: boolean;
  shouldInlineGoalStatus?: boolean;
  /**
   * `pill` matches the Paper Available column: green / gray / red filled
   * capsules by sign. Goal template colors still apply in `plain` mode.
   */
  appearance?: 'plain' | 'pill';
  CarryoverIndicator?: ComponentType<CarryoverIndicatorProps>;
};

export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  longGoal,
  isDisabled,
  shouldInlineGoalStatus,
  appearance = 'plain',
  CarryoverIndicator: CarryoverIndicatorComponent = CarryoverIndicator,
  children,
  ...props
}: BalanceWithCarryoverProps) {
  const carryoverValue = useSheetValue(carryover);
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const longGoalValue = useSheetValue(longGoal);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const getBalanceAmountStyle = useCallback(
    (balanceValue: number) =>
      makeBalanceAmountStyle(
        balanceValue,
        isGoalTemplatesEnabled ? goalValue : null,
        longGoalValue === 1 ? balanceValue : budgetedValue,
      ),
    [budgetedValue, goalValue, isGoalTemplatesEnabled, longGoalValue],
  );

  const getDefaultClassName = useCallback(
    (balanceValue: number) => {
      if (appearance === 'pill') {
        return css({
          ...makeAvailableBalancePillStyle(balanceValue),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'right',
          fontWeight: 500,
          ...(!isDisabled && {
            cursor: 'pointer',
          }),
        });
      }

      return css({
        ...getBalanceAmountStyle(balanceValue),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'right',
        ...(!isDisabled && {
          cursor: 'pointer',
          ':hover': { textDecoration: 'underline' },
        }),
      });
    },
    [appearance, getBalanceAmountStyle, isDisabled],
  );

  return (
    <CellValue binding={balance} type="financial" {...props}>
      {({ type, name, value: balanceValue }) => {
        // Only paint the capsule on the default (no-children) path so
        // callers that supply their own chrome (e.g. mobile) do not double-wrap.
        const showPillChrome = appearance === 'pill' && !children;

        return (
          <>
            <View
              style={{
                minHeight: 'auto',
                flexShrink: 0,
                maxWidth: '100%',
                position: 'relative',
                ...(showPillChrome
                  ? {
                      ...availableBalancePillChrome,
                      ...makeAvailableBalancePillStyle(balanceValue),
                    }
                  : null),
              }}
            >
              {children ? (
                children({
                  type,
                  name,
                  value: balanceValue,
                  className: getDefaultClassName(balanceValue),
                })
              ) : (
                <CellValueText
                  type={type}
                  name={name}
                  value={balanceValue}
                  className={cx(
                    getDefaultClassName(balanceValue),
                    showPillChrome &&
                      css({
                        backgroundColor: 'transparent',
                        color: 'inherit',
                      }),
                  )}
                />
              )}
              {carryoverValue && showPillChrome && (
                <CarryoverIndicatorComponent
                  style={{
                    right: 2,
                    color: 'inherit',
                  }}
                />
              )}
            </View>

            {carryoverValue && !showPillChrome && (
              <CarryoverIndicatorComponent
                style={
                  appearance === 'pill'
                    ? { color: 'inherit' }
                    : getBalanceAmountStyle(balanceValue)
                }
              />
            )}
            {shouldInlineGoalStatus &&
              isGoalTemplatesEnabled &&
              goalValue != null && (
                <>
                  <View
                    style={{
                      borderTop: '1px solid ' + theme.tableBorderSeparator,
                      width: '160px',
                      margin: '3px 0px',
                    }}
                  />
                  <GoalStatus
                    balance={balance}
                    goal={goal}
                    budgeted={budgeted}
                    longGoal={longGoal}
                  />
                </>
              )}
          </>
        );
      }}
    </CellValue>
  );
}
