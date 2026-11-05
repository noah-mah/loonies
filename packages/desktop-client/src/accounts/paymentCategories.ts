import type { AccountEntity } from '@actual-app/core/types/models';

export function getPaymentCategoryIds(accounts: AccountEntity[]): Set<string> {
  const ids = new Set<string>();
  for (const account of accounts) {
    if (account.payment_category) {
      ids.add(account.payment_category);
    }
  }
  return ids;
}
