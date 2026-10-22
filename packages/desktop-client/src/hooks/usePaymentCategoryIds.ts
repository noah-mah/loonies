import { useAccounts } from '#hooks/useAccounts';

export function usePaymentCategoryIds(): Set<string> {
  const { data: accounts = [] } = useAccounts();
  const ids = new Set<string>();
  for (const account of accounts) {
    if (account.payment_category) {
      ids.add(account.payment_category);
    }
  }
  return ids;
}
