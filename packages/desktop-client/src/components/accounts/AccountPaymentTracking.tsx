import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useSetAccountPaymentTrackingMutation } from '#accounts/mutations';

type PaymentKind = 'cash' | 'credit' | 'debt';

type AccountPaymentTrackingProps = {
  account: AccountEntity;
};

export function AccountPaymentTracking({
  account,
}: AccountPaymentTrackingProps) {
  const { t } = useTranslation();
  const setPaymentTracking = useSetAccountPaymentTrackingMutation();
  const [chosenDebtKind, setChosenDebtKind] = useState<'credit' | 'debt'>(
    'credit',
  );

  if (account.offbudget || account.closed) {
    return null;
  }

  const value: PaymentKind = account.payment_category ? chosenDebtKind : 'cash';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: theme.pageTextSubdued }}>
        <Trans>Account kind</Trans>
      </Text>
      <Select
        value={value}
        options={[
          ['cash', t('Cash')],
          ['credit', t('Credit')],
          ['debt', t('Debt')],
        ]}
        onChange={kind => {
          if (kind === 'credit' || kind === 'debt') {
            setChosenDebtKind(kind);
          }
          setPaymentTracking.mutate({ id: account.id, kind });
        }}
      />
    </View>
  );
}
