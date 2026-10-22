import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useCategoryScheduleGoalTemplateIndicator } from '#hooks/useCategoryScheduleGoalTemplateIndicator';
import { useFormat } from '#hooks/useFormat';
import type { Binding } from '#spreadsheet';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

type SpentCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'sum-amount' | 'debt-balance'
  >;
  category: CategoryEntity;
  month: string;
  show3Columns?: boolean;
  isPayment?: boolean;
  onPress?: () => void;
};

export function SpentCell({
  binding,
  category,
  month,
  show3Columns,
  isPayment = false,
  onPress,
}: SpentCellProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth({
    show3Columns,
  });

  const { schedule, scheduleStatus, isScheduleRecurring } =
    useCategoryScheduleGoalTemplateIndicator({
      category,
      month,
    });
  const showScheduleIndicator = !isPayment && schedule && scheduleStatus;

  return (
    <CellValue<
      'envelope-budget' | 'tracking-budget',
      'sum-amount' | 'debt-balance'
    >
      binding={binding}
      type="financial"
      aria-label={
        isPayment
          ? t('Balance for {{categoryName}} category', {
              categoryName: category.name,
            })
          : t('Spent amount for {{categoryName}} category', {
              categoryName: category.name,
            })
      }
    >
      {({ type, value }) => (
        <>
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
              ...(isPayment || !onPress ? { cursor: 'default' } : null),
            }}
            onPress={onPress}
            isDisabled={!onPress}
            aria-label={
              isPayment
                ? t('Balance for {{categoryName}} category', {
                    categoryName: category.name,
                  })
                : t('Show transactions for {{categoryName}} category', {
                    categoryName: category.name,
                  })
            }
          >
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={{
                  ...styles.tnum,
                  ...makeAmountGrey(value),
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                }}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </Button>
          {showScheduleIndicator && (
            <View
              style={{
                position: 'absolute',
                right: '-3px',
                top: '-5px',
                borderRadius: '50%',
                color:
                  scheduleStatus === 'missed'
                    ? theme.errorText
                    : scheduleStatus === 'due'
                      ? theme.warningText
                      : theme.upcomingText,
              }}
            >
              {isScheduleRecurring ? (
                <SvgArrowsSynchronize width={11} height={11} />
              ) : (
                <SvgCalendar3 width={10} height={10} />
              )}
            </View>
          )}
        </>
      )}
    </CellValue>
  );
}
