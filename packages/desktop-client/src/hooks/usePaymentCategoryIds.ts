import { getPaymentCategoryIds } from '#accounts/paymentCategories';
import { useAccounts } from '#hooks/useAccounts';

export function usePaymentCategoryIds(): Set<string> {
  const { data: accounts = [] } = useAccounts();
  return getPaymentCategoryIds(accounts);
}
