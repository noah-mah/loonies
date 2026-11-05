import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { SpendingWidget } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { DateRange } from '#components/reports/DateRange';
import { SpendingGraph } from '#components/reports/graphs/SpendingGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateSpendingReportTimeRange } from '#components/reports/reportRanges';
import {
  getSpendingAverageRangeLabel,
  normalizeSpendingAverageRange,
} from '#components/reports/spendingAverageRange';
import { createSpendingSpreadsheet } from '#components/reports/spreadsheets/spending-spreadsheet';
import { useReport } from '#components/reports/useReport';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';

type SpendingCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SpendingWidget['meta'];
  onMetaChange: (newMeta: SpendingWidget['meta']) => void;
};

export function SpendingCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
}: SpendingCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const budgetType: 'envelope' | 'tracking' =
    budgetTypePref === 'tracking' ? 'tracking' : 'envelope';

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const spendingReportMode = meta?.mode ?? 'single-month';
  const averageRange = normalizeSpendingAverageRange(meta?.averageRange);
  const averageRangeLabel = getSpendingAverageRangeLabel(averageRange, t);

  const [compare, compareTo] = calculateSpendingReportTimeRange(meta ?? {});

  const selection =
    spendingReportMode === 'single-month' ? 'compareTo' : spendingReportMode;
  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      compare,
      compareTo,
      averageRange,
      budgetType,
      reportMode: spendingReportMode,
    });
  }, [
    meta?.conditions,
    meta?.conditionsOp,
    compare,
    compareTo,
    averageRange,
    budgetType,
    spendingReportMode,
  ]);

  const data = useReport('default', getGraphData);
  const todayDay =
    compare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const spentMtd =
    data == null ? null : Math.abs(data.intervalData[todayDay]?.compare ?? 0);
  const budgetRemaining =
    spendingReportMode === 'budget' && data != null
      ? Math.round((data.monthBudgetTotal ?? 0) - (spentMtd ?? 0))
      : null;
  const difference =
    data == null
      ? null
      : spendingReportMode === 'budget'
        ? budgetRemaining
        : Math.round(
            data.intervalData[todayDay][selection] -
              data.intervalData[todayDay].compare,
          );
  const isUnfavorableDifference =
    difference == null
      ? false
      : spendingReportMode === 'budget'
        ? difference < 0
        : difference > 0;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/spending/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Monthly Spending')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <DateRange
              start={compare}
              end={compareTo}
              type={spendingReportMode}
              comparisonLabel={
                spendingReportMode === 'average' ? averageRangeLabel : undefined
              }
            />
          </View>
          {data && difference != null && (
            <View style={{ textAlign: 'right' }}>
              <Tooltip
                content={
                  spendingReportMode === 'budget'
                    ? t(
                        'Budgeted for the month minus spending so far. The chart compares daily spending to a prorated budget pace.',
                      )
                    : undefined
                }
                placement="bottom end"
              >
                <Block
                  style={{
                    ...styles.mediumText,
                    fontWeight: 500,
                    marginBottom: 5,
                    color:
                      difference === 0
                        ? theme.reportsNumberNeutral
                        : isUnfavorableDifference
                          ? theme.reportsNumberNegative
                          : theme.reportsNumberPositive,
                  }}
                >
                  <PrivacyFilter activationFilters={[!isCardHovered]}>
                    <FinancialText>
                      {spendingReportMode !== 'budget' && difference > 0
                        ? '+'
                        : ''}
                      {format(difference, 'financial')}
                    </FinancialText>
                  </PrivacyFilter>
                </Block>
              </Tooltip>
            </View>
          )}
        </View>
        {data ? (
          <SpendingGraph
            style={{ flex: 1 }}
            compact
            data={data}
            mode={spendingReportMode}
            compare={compare}
            compareTo={compareTo}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
