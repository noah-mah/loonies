import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';

type MergeUnusedPayeesParams = {
  targetPayee: PayeeEntity;
  payeesToMerge: PayeeEntity[];
  createRenameRule: boolean;
  isEditingRule: boolean;
};

export async function mergeUnusedPayees({
  targetPayee,
  payeesToMerge,
  createRenameRule,
  isEditingRule,
}: MergeUnusedPayeesParams): Promise<string | undefined> {
  await send('payees-merge', {
    targetId: targetPayee.id,
    mergeIds: payeesToMerge.map(payee => payee.id),
  });

  if (createRenameRule && !isEditingRule) {
    return await send('rule-add-payee-rename', {
      fromNames: payeesToMerge.map(payee => payee.name),
      to: targetPayee.id,
    });
  }

  return undefined;
}
