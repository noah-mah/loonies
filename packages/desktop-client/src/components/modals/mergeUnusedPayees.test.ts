import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergeUnusedPayees } from './mergeUnusedPayees';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

describe('mergeUnusedPayees', () => {
  const targetPayee = { id: 'store', name: 'Store' } as PayeeEntity;
  const payeesToMerge = [{ id: '25', name: 'Old Payee' }] as PayeeEntity[];

  beforeEach(() => {
    vi.mocked(send).mockReset();
    vi.mocked(send).mockImplementation(async (name: string) => {
      if (name === 'rule-add-payee-rename') {
        return 'rule-id';
      }
      return undefined;
    });
  });

  it('creates a payee rename rule when createRenameRule is true', async () => {
    const ruleId = await mergeUnusedPayees({
      targetPayee,
      payeesToMerge,
      createRenameRule: true,
      isEditingRule: false,
    });

    expect(ruleId).toBe('rule-id');
    expect(send).toHaveBeenCalledWith('payees-merge', {
      targetId: 'store',
      mergeIds: ['25'],
    });
    expect(send).toHaveBeenCalledWith('rule-add-payee-rename', {
      fromNames: ['Old Payee'],
      to: 'store',
    });
  });

  it('does not create a payee rename rule when createRenameRule is false', async () => {
    const ruleId = await mergeUnusedPayees({
      targetPayee,
      payeesToMerge,
      createRenameRule: false,
      isEditingRule: false,
    });

    expect(ruleId).toBeUndefined();
    expect(send).toHaveBeenCalledWith('payees-merge', {
      targetId: 'store',
      mergeIds: ['25'],
    });
    expect(send).not.toHaveBeenCalledWith(
      'rule-add-payee-rename',
      expect.anything(),
    );
  });

  it('does not create a payee rename rule while editing a rule', async () => {
    const ruleId = await mergeUnusedPayees({
      targetPayee,
      payeesToMerge,
      createRenameRule: true,
      isEditingRule: true,
    });

    expect(ruleId).toBeUndefined();
    expect(send).not.toHaveBeenCalledWith(
      'rule-add-payee-rename',
      expect.anything(),
    );
  });
});
