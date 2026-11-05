import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePayees } from '#hooks/usePayees';
import { createTestAppStore, TestProviders } from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { MergeUnusedPayeesModal } from './MergeUnusedPayeesModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

vi.mock('#hooks/usePayees', () => ({
  usePayees: vi.fn(),
}));

describe('MergeUnusedPayeesModal', () => {
  const targetPayee = { id: 'store', name: 'Store' } as PayeeEntity;
  const orphanedPayee = { id: '25', name: 'Old Payee' } as PayeeEntity;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePayees).mockReturnValue({
      data: [targetPayee, orphanedPayee],
      isLoading: false,
    } as ReturnType<typeof usePayees>);
    vi.mocked(send).mockImplementation(async (name: string) => {
      if (name === 'rule-add-payee-rename') {
        return 'rule-id';
      }
      return undefined;
    });
  });

  function renderModal() {
    const store = createTestAppStore();
    store.dispatch(
      pushModal({
        modal: {
          name: 'merge-unused-payees',
          options: {
            payeeIds: [orphanedPayee.id],
            targetPayeeId: targetPayee.id,
          },
        },
      }),
    );

    return render(
      <TestProviders store={store}>
        <MergeUnusedPayeesModal
          payeeIds={[orphanedPayee.id]}
          targetPayeeId={targetPayee.id}
        />
      </TestProviders>,
    );
  }

  it('does not create a rename rule when the checkbox is unchecked before merge', async () => {
    renderModal();

    const checkbox = screen.getByRole('checkbox', {
      name: 'Automatically rename these payees in the future',
    });
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Merge' }));

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith('payees-merge', {
        targetId: 'store',
        mergeIds: ['25'],
      });
    });
    expect(send).not.toHaveBeenCalledWith(
      'rule-add-payee-rename',
      expect.anything(),
    );
  });

  it('creates a rename rule when the checkbox stays checked', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Merge' }));

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith('rule-add-payee-rename', {
        fromNames: ['Old Payee'],
        to: 'store',
      });
    });
  });
});
