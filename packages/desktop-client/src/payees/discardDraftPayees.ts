import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';

/** Removes payees that are still unused after cancelling an unsaved transaction. */
export async function discardPayeesCreatedDuringAdd(
  payeeIds: Iterable<PayeeEntity['id']>,
): Promise<void> {
  const ids = [...new Set(payeeIds)];
  if (ids.length === 0) {
    return;
  }

  const orphaned: PayeeEntity['id'][] = await send('payees-check-orphaned', {
    ids,
  });

  if (orphaned.length === 0) {
    return;
  }

  await send('payees-batch-change', {
    deleted: orphaned.map(id => ({ id })),
  });
}
