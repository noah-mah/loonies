import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgSearch } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { currentDay } from '@actual-app/core/shared/months';
import { currencyToInteger } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';
import { format, isValid, parse, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { useCreateCategoryMutation } from '#budget';
import { Modal } from '#components/common/Modal';
import { SidebarBalance } from '#components/sidebar/redesign/SidebarBalance';
import { useSidebarAccountTree } from '#components/sidebar/redesign/useSidebarAccountTree';
import type {
  GroupBucket,
  SidebarAccountSide,
} from '#components/sidebar/redesign/useSidebarAccountTree';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { usePayees } from '#hooks/usePayees';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { closeModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { getActivePayees, useCreatePayeeMutation } from '#payees';
import { useDispatch } from '#redux';
import { accountBalance } from '#spreadsheet/bindings';

import { TransactionFieldMenu } from './TransactionFieldMenu';

const LIST_HEIGHT = 400;

const rowClassName = css({
  width: '100%',
  height: 36,
  minHeight: 0,
  padding: '0 8px',
  borderRadius: 6,
  justifyContent: 'flex-start',
  gap: 10,
  backgroundColor: 'transparent',
  color: theme.pageText,
  '&[data-hovered]': {
    backgroundColor: theme.sidebarItemBackgroundHover,
    color: theme.pageText,
  },
  '&[data-selected]': {
    backgroundColor: theme.sidebarControlBackground,
  },
});

type AccountSection = {
  label: string;
  accounts: AccountEntity[];
};

function accountsMatching(accounts: AccountEntity[], query: string) {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') {
    return accounts;
  }

  return accounts.filter(account =>
    account.name.toLowerCase().includes(trimmed),
  );
}

function sectionsForSide(
  fallbackLabel: string,
  side: SidebarAccountSide,
  query: string,
): AccountSection[] {
  return side.buckets.flatMap((bucket: GroupBucket) => {
    const accounts = accountsMatching(bucket.accounts, query);
    if (accounts.length === 0) {
      return [];
    }

    return [
      {
        label: bucket.group?.name ?? fallbackLabel,
        accounts,
      },
    ];
  });
}

const fieldClassName = css({
  '&&': {
    width: '100%',
    height: 36,
    minHeight: 0,
    borderRadius: 6,
    backgroundColor: theme.pageBackground,
    border: `1px solid ${theme.tableBorder}`,
    color: theme.pageText,
    fontSize: 14,
    lineHeight: '18px',
    padding: '0 12px',
  },
  '&&::placeholder': {
    color: theme.pageTextSubdued,
  },
});

const fieldLabelStyle = {
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  color: theme.pageText,
} as const;

type AmountDirection = 'outflow' | 'inflow';

function toIsoDate(value: string, dateFormat: string) {
  const parsed = parse(value, dateFormat, new Date());
  if (!isValid(parsed)) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
}

type TransactionDetailsProps = {
  account: AccountEntity;
  onBack: () => void;
  onChangeAccount: () => void;
};

function TransactionDetails({
  account,
  onBack,
  onChangeAccount,
}: TransactionDetailsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const dateFormat = useDateFormat() || 'yyyy-MM-dd';
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const createPayee = useCreatePayeeMutation();
  const createCategory = useCreateCategoryMutation();
  const { data: categories } = useCategories();
  const { data: payees = [] } = usePayees();
  const { data: accounts = [] } = useAccounts();
  const [dateText, setDateText] = useState(() =>
    format(parseISO(currentDay()), dateFormat),
  );
  const [payeeId, setPayeeId] = useState<string | null>(null);
  const [payeeName, setPayeeName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [direction, setDirection] = useState<AmountDirection>('outflow');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activePayees = getActivePayees(payees, accounts);
  const payeeSections = [
    {
      label: t('Payees'),
      items: activePayees
        .filter(payee => payee.transfer_acct == null)
        .map(payee => ({ id: payee.id, name: payee.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
    {
      label: t('Transfer To/From'),
      items: activePayees
        .filter(payee => payee.transfer_acct != null)
        .map(payee => ({ id: payee.id, name: payee.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
  ].filter(section => section.items.length > 0);

  const categoryGroups = categories?.grouped ?? [];
  const categorySections = categoryGroups
    .filter(group => !group.hidden)
    .map(group => ({
      label: group.name,
      items: (group.categories ?? [])
        .filter(category => !category.hidden && category.group === group.id)
        .map(category => ({ id: category.id, name: category.name })),
    }))
    .filter(section => section.items.length > 0);
  const categoryGroupForCreate =
    categoryGroups.find(group => !group.hidden && !group.is_income) ??
    categoryGroups.find(group => !group.hidden) ??
    null;

  function payeeNameFor(id: string | null) {
    return activePayees.find(payee => payee.id === id)?.name ?? '';
  }

  function categoryNameFor(id: string | null) {
    return categories?.list.find(category => category.id === id)?.name ?? '';
  }

  async function onCreateCategory(name: string) {
    if (categoryGroupForCreate == null) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Add a category group before creating a category'),
          },
        }),
      );
      throw new Error('No category group');
    }

    const id = await createCategory.mutateAsync({
      name,
      groupId: categoryGroupForCreate.id,
      isIncome: categoryGroupForCreate.is_income === true,
      isHidden: false,
    });
    setCategoryId(id);
    setCategoryName(name);
  }

  async function onAdd() {
    const date = toIsoDate(dateText, dateFormat);
    if (date == null) {
      dispatch(
        addNotification({
          notification: { type: 'error', message: t('Enter a valid date') },
        }),
      );
      return;
    }

    const amount = currencyToInteger(amountText.trim());
    if (amount == null) {
      dispatch(
        addNotification({
          notification: { type: 'error', message: t('Enter an amount') },
        }),
      );
      return;
    }

    setIsSaving(true);
    try {
      let resolvedPayeeId = payeeId;
      const trimmedPayee = payeeName.trim();
      if (resolvedPayeeId == null && trimmedPayee !== '') {
        resolvedPayeeId = await createPayee.mutateAsync({ name: trimmedPayee });
      }

      const signedAmount =
        direction === 'outflow' ? -Math.abs(amount) : Math.abs(amount);

      await send('transactions-batch-update', {
        added: [
          {
            id: uuidv4(),
            account: account.id,
            date,
            amount: signedAmount,
            payee: resolvedPayeeId,
            category: categoryId ?? undefined,
            notes: note.trim() === '' ? undefined : note.trim(),
            cleared: false,
            sort_order: Date.now(),
          },
        ],
        learnCategories: String(learnCategories) === 'true',
      });

      dispatch(closeModal());
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Unable to add the transaction'),
          },
        }),
      );
      setIsSaving(false);
    }
  }

  return (
    <View style={{ flexShrink: 0 }}>
      <View
        style={{
          gap: 12,
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${theme.tableBorder}`,
        }}
      >
        <Text
          id="choose-transaction-account-title"
          style={{
            fontSize: 18,
            fontWeight: 600,
            lineHeight: '24px',
            letterSpacing: '-0.03em',
            color: theme.pageText,
          }}
        >
          <Trans>New transaction</Trans>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 16,
              height: 16,
              flexShrink: 0,
              borderRadius: 999,
              backgroundColor: theme.pageText,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: theme.cardBackground,
              }}
            />
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: '18px',
              color: theme.pageText,
            }}
          >
            {account.name}
          </Text>
          <Button variant="bare" onPress={onChangeAccount}>
            <Text style={{ color: theme.pageTextSubdued, fontWeight: 500 }}>
              <Trans>Change</Trans>
            </Text>
          </Button>
        </View>
      </View>

      <View style={{ gap: 16, padding: 20 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={fieldLabelStyle}>
              <Trans>Date</Trans>
            </Text>
            <Input
              value={dateText}
              aria-label={t('Date')}
              onChangeValue={setDateText}
              className={fieldClassName}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={fieldLabelStyle}>
              <Trans>Payee</Trans>
            </Text>
            <TransactionFieldMenu
              value={payeeName}
              placeholder={t('Payee')}
              ariaLabel={t('Payee')}
              sections={payeeSections}
              createLabel="payee"
              inputClassName={fieldClassName}
              onChangeValue={value => {
                setPayeeName(value);
                setPayeeId(null);
              }}
              onSelect={id => {
                setPayeeId(id);
                setPayeeName(payeeNameFor(id));
              }}
              onCreate={async name => {
                const id = await createPayee.mutateAsync({ name });
                setPayeeId(id);
                setPayeeName(name);
              }}
              onClose={() => {
                if (payeeId == null) {
                  setPayeeName('');
                  return;
                }

                const known = payeeNameFor(payeeId);
                if (known !== '') {
                  setPayeeName(known);
                }
              }}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={fieldLabelStyle}>
            <Trans>Category</Trans>
          </Text>
          <TransactionFieldMenu
            value={categoryName}
            placeholder={t('Category')}
            ariaLabel={t('Category')}
            sections={categorySections}
            createLabel="category"
            inputClassName={fieldClassName}
            onChangeValue={value => {
              setCategoryName(value);
              setCategoryId(null);
            }}
            onSelect={id => {
              setCategoryId(id);
              setCategoryName(categoryNameFor(id));
            }}
            onCreate={onCreateCategory}
            onClose={() => {
              if (categoryId == null) {
                setCategoryName('');
                return;
              }

              const known = categoryNameFor(categoryId);
              if (known !== '') {
                setCategoryName(known);
              }
            }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={fieldLabelStyle}>
            <Trans>Amount</Trans>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Input
              value={amountText}
              aria-label={t('Amount')}
              placeholder="0.00"
              onChangeValue={setAmountText}
              className={cx(fieldClassName, css({ flex: 1 }))}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexShrink: 0,
                height: 36,
                padding: 2,
                gap: 2,
                borderRadius: 6,
                backgroundColor: theme.sidebarControlBackground,
              }}
            >
              {(['outflow', 'inflow'] as const).map(option => {
                const isSelected = direction === option;

                return (
                  <Button
                    key={option}
                    variant="bare"
                    aria-pressed={isSelected}
                    onPress={() => setDirection(option)}
                    style={{
                      height: 32,
                      minHeight: 0,
                      padding: '0 10px',
                      borderRadius: 4,
                      backgroundColor: isSelected
                        ? theme.cardBackground
                        : 'transparent',
                      boxShadow: isSelected
                        ? '0 0 3px rgba(0, 0, 0, 0.1)'
                        : 'none',
                      color: isSelected
                        ? theme.pageText
                        : theme.pageTextSubdued,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {option === 'outflow' ? (
                      <Trans>Outflow</Trans>
                    ) : (
                      <Trans>Inflow</Trans>
                    )}
                  </Button>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={fieldLabelStyle}>
            <Trans>Note</Trans>
          </Text>
          <Input
            value={note}
            aria-label={t('Note')}
            placeholder={t('Add a note')}
            onChangeValue={setNote}
            className={fieldClassName}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          padding: '16px 20px',
          borderTop: `1px solid ${theme.tableBorder}`,
        }}
      >
        <Button variant="bare" onPress={onBack}>
          <Trans>Back</Trans>
        </Button>
        <Button
          variant="primary"
          isDisabled={isSaving}
          data-testid="add-transaction"
          onPress={() => {
            void onAdd();
          }}
          style={{
            backgroundColor: theme.pageText,
            color: theme.cardBackground,
            borderRadius: 6,
            height: 34,
          }}
        >
          <Trans>Add transaction</Trans>
        </Button>
      </View>
    </View>
  );
}

export function ChooseTransactionAccountModal() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const tree = useSidebarAccountTree();
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<'account' | 'details'>('account');
  const [selectedId, setSelectedId] = useState<AccountEntity['id'] | null>(
    null,
  );

  const sections = useMemo(
    () => [
      ...sectionsForSide(t('On budget'), tree.onBudget, query),
      ...sectionsForSide(t('Off budget'), tree.offBudget, query),
    ],
    [query, t, tree.offBudget, tree.onBudget],
  );

  const selectedAccount = useMemo(() => {
    const accounts = [
      ...tree.onBudget.buckets,
      ...tree.offBudget.buckets,
    ].flatMap(bucket => bucket.accounts);

    return accounts.find(account => account.id === selectedId) ?? null;
  }, [selectedId, tree.offBudget.buckets, tree.onBudget.buckets]);

  function onCancel() {
    dispatch(closeModal());
  }

  function onContinue() {
    if (selectedAccount == null) {
      return;
    }

    setStep('details');
  }

  return (
    <Modal
      name="choose-transaction-account"
      ariaLabelledBy="choose-transaction-account-title"
      containerProps={{
        style: {
          width: 640,
          minWidth: 0,
          maxWidth: 'min(640px, 90vw)',
          padding: 0,
          overflow: 'visible',
          borderRadius: 12,
          backgroundColor: theme.cardBackground,
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {step === 'details' && selectedAccount != null ? (
        <TransactionDetails
          account={selectedAccount}
          onBack={() => setStep('account')}
          onChangeAccount={() => setStep('account')}
        />
      ) : (
        <View style={{ flexShrink: 0 }}>
          <View
            style={{
              gap: 12,
              padding: '20px 20px 16px',
              borderBottom: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Text
              id="choose-transaction-account-title"
              style={{
                fontSize: 18,
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '-0.03em',
                color: theme.pageText,
              }}
            >
              <Trans>New transaction</Trans>
            </Text>
            <View style={{ position: 'relative' }}>
              <SvgSearch
                width={16}
                height={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 10,
                  color: theme.pageTextSubdued,
                }}
              />
              <Input
                value={query}
                aria-label={t('Search accounts')}
                placeholder={t('Search accounts')}
                onChangeValue={setQuery}
                className={css({
                  width: '100%',
                  height: 36,
                  paddingLeft: 36,
                  borderRadius: 6,
                  backgroundColor: theme.pageBackground,
                  border: `1px solid ${theme.tableBorder}`,
                  fontSize: 14,
                })}
              />
            </View>
          </View>

          <View
            data-testid="choose-transaction-account-list"
            style={{
              height: LIST_HEIGHT,
              flexShrink: 0,
              overflowY: 'auto',
              gap: 16,
              padding: '8px 12px 12px',
              ...styles.lightScrollbar,
            }}
          >
            {sections.length === 0 ? (
              <Text style={{ padding: 8, color: theme.pageTextSubdued }}>
                <Trans>No accounts</Trans>
              </Text>
            ) : (
              sections.map(section => (
                <View key={section.label} style={{ gap: 2 }}>
                  <Text
                    style={{
                      padding: '4px 8px 6px',
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: '18px',
                      color: theme.pageText,
                    }}
                  >
                    {section.label}
                  </Text>
                  <View role="radiogroup" aria-label={section.label}>
                    {section.accounts.map(account => {
                      const isSelected = account.id === selectedId;

                      return (
                        <Button
                          key={account.id}
                          variant="bare"
                          aria-checked={isSelected}
                          data-testid={`choose-account-${account.id}`}
                          className={cx(rowClassName)}
                          style={{
                            backgroundColor: isSelected
                              ? theme.sidebarControlBackground
                              : undefined,
                          }}
                          onPress={() => setSelectedId(account.id)}
                        >
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              flexShrink: 0,
                              borderRadius: 999,
                              boxSizing: 'border-box',
                              border: isSelected
                                ? 'none'
                                : `1.5px solid ${theme.pageTextSubdued}`,
                              backgroundColor: isSelected
                                ? theme.pageText
                                : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isSelected && (
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 999,
                                  backgroundColor: theme.cardBackground,
                                }}
                              />
                            )}
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              fontSize: 14,
                              fontWeight: isSelected ? 500 : 400,
                              color: theme.pageText,
                            }}
                          >
                            {account.name}
                          </Text>
                          <View style={{ width: 110, flexShrink: 0 }}>
                            <SidebarBalance
                              binding={accountBalance(account.id)}
                              style={{
                                ...styles.tnum,
                                fontSize: 14,
                                fontWeight: isSelected ? 500 : 400,
                                color: theme.pageText,
                              }}
                            />
                          </View>
                        </Button>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
              padding: '16px 20px',
              borderTop: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Button variant="bare" onPress={onCancel}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              isDisabled={selectedId == null}
              data-testid="choose-transaction-account-continue"
              onPress={onContinue}
              style={{
                backgroundColor: theme.pageText,
                color: theme.cardBackground,
                borderRadius: 6,
                height: 34,
              }}
            >
              <Trans>Continue</Trans>
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
