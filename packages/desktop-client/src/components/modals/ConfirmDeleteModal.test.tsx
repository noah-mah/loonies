import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const onClose = vi.fn();

vi.mock('#hooks/useModalState', () => ({
  useModalState: () => ({
    activeModal: 'confirm-delete',
    isActive: () => true,
    isHidden: false,
    modalStack: [],
    onClose,
  }),
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeysContext: () => ({
    disableScope: vi.fn(),
    enableScope: vi.fn(),
  }),
}));

describe('ConfirmDeleteModal', () => {
  beforeEach(() => {
    onClose.mockClear();
  });

  it('confirms and closes the Coss alert', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteModal message="Delete this payee?" onConfirm={onConfirm} />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes without confirming when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteModal message="Delete this payee?" onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
