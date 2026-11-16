import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';

import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Toggle } from './Toggle';

it('calls onPress for a primary button', async () => {
  const user = userEvent.setup();
  let pressed = false;

  render(
    <Button variant="primary" onPress={() => (pressed = true)}>
      Save
    </Button>,
  );

  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(pressed).toBe(true);
  expect(screen.getByRole('button', { name: 'Save' }).className).toContain(
    'bg-primary',
  );
});

it('does not call onPress when the button is disabled', async () => {
  const user = userEvent.setup();
  let pressed = false;

  render(
    <Button isDisabled onPress={() => (pressed = true)}>
      Save
    </Button>,
  );

  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(pressed).toBe(false);
});

it('reports the next toggle state', async () => {
  const user = userEvent.setup();
  let next = false;

  render(
    <Toggle
      id="sync"
      isOn={false}
      aria-label="Sync"
      onToggle={value => {
        next = value;
      }}
    />,
  );

  await user.click(screen.getByRole('switch', { name: 'Sync' }));

  expect(next).toBe(true);
});

it('sets React Aria-compatible data attributes on buttons', async () => {
  const user = userEvent.setup();

  render(<Button variant="bare">Hover me</Button>);

  const button = screen.getByRole('button', { name: 'Hover me' });
  expect(button.getAttribute('data-hovered')).toBeNull();

  await user.hover(button);

  expect(button.getAttribute('data-hovered')).toBe('');
});

it('applies input styles on the native input element', () => {
  render(<Input data-testid="budget-field" defaultValue="42" />);

  const control = screen
    .getByTestId('budget-field')
    .closest('[data-slot=input-control]');
  expect(control?.className).not.toContain('border-input');

  const input = screen.getByDisplayValue('42');
  expect(input.getAttribute('data-slot')).toBe('input');
  expect(control?.className).toContain('contents');
});

it('keeps className, style, and data-focused on the native input', async () => {
  const user = userEvent.setup();
  render(
    <Input
      defaultValue="rent"
      className="payee-name"
      style={{ color: 'rgb(1, 2, 3)' }}
    />,
  );

  const input = screen.getByDisplayValue('rent');
  await user.click(input);

  expect(input.className).toContain('payee-name');
  expect(input.getAttribute('data-focused')).toBe('');
  const wrapper = input.closest('[data-slot=input-control]');
  expect(wrapper?.className ?? '').not.toContain('payee-name');
  expect(wrapper?.getAttribute('style')).toBeNull();
  expect(getComputedStyle(input).color).toBe('rgb(1, 2, 3)');
});

it('changes the select value from the Coss list', async () => {
  const user = userEvent.setup();
  let next = 'light';

  render(
    <Select
      options={[
        ['light', 'Light'],
        ['dark', 'Dark'],
      ]}
      value="light"
      onChange={value => {
        next = value;
      }}
    />,
  );

  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: 'Dark' }));

  expect(next).toBe('dark');
});
