import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModalHeader } from '#components/common/Modal';

import { SingleInputModal } from './SingleInputModal';

const onClose = vi.fn();

vi.mock('#hooks/useModalState', () => ({
  useModalState: () => ({
    activeModal: 'new-category',
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

function Header(props: ComponentProps<typeof ModalHeader>) {
  return <div data-testid="modal-header" {...props} />;
}

describe('SingleInputModal', () => {
  beforeEach(() => {
    onClose.mockClear();
  });

  it('shows validation errors without closing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <SingleInputModal
        name="new-category"
        Header={Header}
        buttonText="Add"
        onValidate={value => (!value.trim() ? 'Name is required.' : null)}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
