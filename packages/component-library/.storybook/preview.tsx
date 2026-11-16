import { type ReactNode } from 'react';

import type { Preview } from '@storybook/react-vite';

import '../src/coss/styles/globals.css';
import paletteCss from '../src/themes/palette.css?inline';
import semanticCss from '../src/themes/semantic.css?inline';

const ThemedStory = ({
  themeName,
  children,
}: {
  themeName?: 'light' | 'dark';
  children?: ReactNode;
}) => {
  if (themeName !== 'light' && themeName !== 'dark') {
    throw new Error(`No theme specified`);
  }

  return (
    <div className={themeName === 'dark' ? 'dark' : undefined}>
      <style>{paletteCss}</style>
      <style>{semanticCss}</style>
      {children}
    </div>
  );
};

const preview: Preview = {
  decorators: [
    (Story, { globals }) => {
      const themeName = globals.theme;

      return (
        <ThemedStory themeName={themeName}>
          <Story />
        </ThemedStory>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
