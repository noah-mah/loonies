// @ts-strict-ignore
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { toRelaxedNumber } from '@actual-app/core/shared/util';

import { useCreateAccountMutation } from '#accounts';
import { Link } from '#components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useNavigate } from '#hooks/useNavigate';
import { usePaymentCategoryIds } from '#hooks/usePaymentCategoryIds';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { closeModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export function CreateLocalAccountModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isUsingServer = useSyncServerStatus() !== 'no-server';
  const { data: accounts = [] } = useAccounts();
  const { data: categories } = useCategories();
  const paymentCategoryIds = usePaymentCategoryIds();
  const [name, setName] = useState('');
  const [offbudget, setOffbudget] = useState(false);
  const [kind, setKind] = useState<'cash' | 'credit' | 'debt'>('cash');
  const [loanPairing, setLoanPairing] = useState('none');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [balance, setBalance] = useState('0');

  const [nameError, setNameError] = useState(null);
  const [balanceError, setBalanceError] = useState(false);

  const validateBalance = balance => !isNaN(parseFloat(balance));

  const validateAndSetName = (name: string) => {
    const nameError = validateAccountName(name, '', accounts);
    if (nameError) {
      setNameError(nameError);
    } else {
      setName(name);
      setNameError(null);
    }
  };

  const createAccount = useCreateAccountMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameError = validateAccountName(name, '', accounts);

    const balanceError = !validateBalance(balance);
    setBalanceError(balanceError);

    if (!nameError && !balanceError) {
      let resolvedOffBudget = offbudget;
      if (kind === 'debt') {
        resolvedOffBudget = true;
      } else if (kind === 'credit') {
        resolvedOffBudget = false;
      }

      let loanCategory: {
        mode: 'none' | 'new' | 'existing';
        name?: string;
        categoryId?: string;
      } = { mode: 'none' };
      if (kind === 'debt' && loanPairing === 'new') {
        loanCategory = {
          mode: 'new',
          name: newCategoryName.trim() || name,
        };
      } else if (kind === 'debt' && loanPairing !== 'none') {
        loanCategory = { mode: 'existing', categoryId: loanPairing };
      }

      createAccount.mutate(
        {
          name,
          balance: toRelaxedNumber(balance),
          offBudget: resolvedOffBudget,
          kind,
          loanCategory,
        },
        {
          onSuccess: id => {
            dispatch(closeModal());
            void navigate('/accounts/' + id);
          },
        },
      );
    }
  };
  return (
    <Modal name="add-local-account">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={
                  isUsingServer ? t('Create Local Account') : t('Add account')
                }
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            {!isUsingServer && (
              <Text
                style={{
                  color: theme.pageTextSubdued,
                  lineHeight: 1.5,
                  marginBottom: 15,
                }}
              >
                <Trans>
                  Once the account is created, you can also{' '}
                  <Link
                    variant="external"
                    linkColor="muted"
                    to="https://actualbudget.org/docs/transactions/importing"
                  >
                    import QIF/OFX/QFX files
                  </Link>{' '}
                  into it.
                </Trans>
              </Text>
            )}
            <Form onSubmit={onSubmit}>
              <InlineField label={t('Name')} width="100%">
                <InitialFocus>
                  <Input
                    name="name"
                    value={name}
                    placeholder={t('e.g. Bank, Savings, Credit Card, Cash')}
                    onChangeValue={setName}
                    onUpdate={value => {
                      const name = value.trim();
                      validateAndSetName(name);
                    }}
                    style={{ flex: 1 }}
                  />
                </InitialFocus>
              </InlineField>
              {nameError && (
                <FormError style={{ marginLeft: 75, color: theme.warningText }}>
                  {nameError}
                </FormError>
              )}

              <InlineField label={t('Account kind')} width="100%">
                <Select
                  value={kind}
                  options={[
                    ['cash', t('Cash')],
                    ['credit', t('Credit card')],
                    ['debt', t('Debt')],
                  ]}
                  onChange={setKind}
                />
              </InlineField>

              {kind === 'cash' && (
                <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      id="offbudget"
                      name="offbudget"
                      checked={offbudget}
                      onChange={() => setOffbudget(!offbudget)}
                    />
                    <label
                      htmlFor="offbudget"
                      style={{
                        userSelect: 'none',
                      }}
                    >
                      <Trans>Off budget</Trans>
                    </label>
                  </View>
                  <Text
                    style={{
                      textAlign: 'right',
                      fontSize: '0.7em',
                      color: theme.pageTextLight,
                      marginTop: 3,
                      maxWidth: 360,
                    }}
                  >
                    <Trans>
                      Off-budget accounts (like investments or your house) are
                      tracked but not part of your spending budget. This cannot
                      be changed later. See{' '}
                      <Link
                        variant="external"
                        linkColor="muted"
                        to="https://actualbudget.org/docs/accounts/#off-budget-accounts"
                      >
                        Accounts Overview
                      </Link>{' '}
                      for more information.
                    </Trans>
                  </Text>
                </View>
              )}
              {kind === 'credit' && (
                <Text
                  style={{
                    textAlign: 'right',
                    fontSize: '0.7em',
                    color: theme.pageTextLight,
                    marginBottom: 12,
                    maxWidth: 360,
                    alignSelf: 'flex-end',
                  }}
                >
                  <Trans>
                    Credit cards stay in your budget and get a payment row. This
                    cannot be changed later.
                  </Trans>
                </Text>
              )}
              {kind === 'debt' && (
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      textAlign: 'right',
                      fontSize: '0.7em',
                      color: theme.pageTextLight,
                      marginBottom: 8,
                      maxWidth: 360,
                      alignSelf: 'flex-end',
                    }}
                  >
                    <Trans>
                      Loans are tracked off budget. This cannot be changed
                      later.
                    </Trans>
                  </Text>
                  <InlineField label={t('Payment category')} width="100%">
                    <Select
                      value={loanPairing}
                      options={[
                        ['none', t('No category')],
                        ['new', t('Create a new category')],
                        ...expenseCategoryOptions(
                          categories,
                          paymentCategoryIds,
                        ),
                      ]}
                      onChange={setLoanPairing}
                    />
                  </InlineField>
                  {loanPairing === 'new' && (
                    <InlineField label={t('Category name')} width="100%">
                      <Input
                        value={newCategoryName}
                        placeholder={name || t('Car payment')}
                        onChangeValue={setNewCategoryName}
                      />
                    </InlineField>
                  )}
                  {loanPairing !== 'none' && (
                    <Text
                      style={{
                        textAlign: 'right',
                        fontSize: '0.7em',
                        color: theme.pageTextLight,
                        maxWidth: 360,
                        alignSelf: 'flex-end',
                      }}
                    >
                      <Trans>
                        Assign money to this category for the payment. A
                        transfer to this loan uses it.
                      </Trans>
                    </Text>
                  )}
                </View>
              )}

              <InlineField label={t('Balance')} width="100%">
                <Input
                  name="balance"
                  inputMode="decimal"
                  value={balance}
                  onChangeValue={setBalance}
                  onUpdate={value => {
                    const balance = value.trim();
                    setBalance(balance);
                    if (validateBalance(balance) && balanceError) {
                      setBalanceError(false);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              </InlineField>
              {balanceError && (
                <FormError style={{ marginLeft: 75 }}>
                  <Trans>Balance must be a number</Trans>
                </FormError>
              )}

              <ModalButtons>
                <Button onPress={() => state.close()}>
                  {isUsingServer ? <Trans>Back</Trans> : <Trans>Cancel</Trans>}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{ marginLeft: 10 }}
                >
                  <Trans>Create</Trans>
                </Button>
              </ModalButtons>
            </Form>
          </View>
        </>
      )}
    </Modal>
  );
}

function expenseCategoryOptions(
  categories:
    | {
        grouped?: Array<{
          name?: string;
          is_income?: boolean;
          hidden?: boolean;
          categories?: Array<{ id: string; name?: string; hidden?: boolean }>;
        }>;
      }
    | undefined,
  paymentCategoryIds: Set<string>,
) {
  const options: Array<[string, string]> = [];
  for (const group of categories?.grouped ?? []) {
    if (group.is_income || group.hidden) {
      continue;
    }
    for (const category of group.categories ?? []) {
      if (
        !category.id ||
        category.hidden ||
        paymentCategoryIds.has(category.id)
      ) {
        continue;
      }
      options.push([category.id, `${group.name}: ${category.name}`]);
    }
  }
  return options;
}
