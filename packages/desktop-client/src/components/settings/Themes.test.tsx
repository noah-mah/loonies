import type { Theme } from '@actual-app/core/types/prefs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as StyleModule from '#style';

import { ThemeSettings } from './Themes';

const mockSwitchTheme = vi.fn();

let mockTheme: Theme = 'light';

vi.mock('#style', async () => {
  const actual = await vi.importActual<typeof StyleModule>('#style');
  return {
    ...actual,
    useTheme: () => [mockTheme, mockSwitchTheme],
  };
});

vi.mock('#components/sidebar/SidebarProvider', () => ({
  useSidebar: () => ({ floating: false }),
}));

describe('ThemeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
  });

  it('switches to the built-in dark theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSettings />);

    await user.click(screen.getByRole('button', { name: 'Light' }));
    await user.click(await screen.findByRole('button', { name: 'Dark' }));

    expect(mockSwitchTheme).toHaveBeenCalledWith('dark');
  });

  it('does not offer midnight or a custom theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSettings />);

    await user.click(screen.getByRole('button', { name: 'Light' }));

    expect(screen.queryByRole('button', { name: 'Midnight' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Custom theme' })).toBeNull();
    expect(
      await screen.findByRole('button', { name: 'System default' }),
    ).toBeVisible();
  });
});
