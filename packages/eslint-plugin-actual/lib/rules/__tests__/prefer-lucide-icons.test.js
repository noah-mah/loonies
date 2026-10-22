import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';

const rule = plugin.rules['prefer-lucide-icons'];

void runClassic(
  'prefer-lucide-icons',
  rule,
  {
    valid: [
      {
        code: `
import { Plus } from 'lucide-react';
import { createLucideIcon } from '../createLucideIcon';
export const SvgAdd = createLucideIcon(Plus);
`,
        filename: 'packages/component-library/src/icons/v1/Add.tsx',
      },
      {
        code: `import { SvgAdd } from '@actual-app/components/icons/v1';`,
        filename: 'packages/desktop-client/src/components/Foo.tsx',
      },
      {
        code: `import { Plus } from 'lucide-react';`,
        filename: 'packages/desktop-client/src/components/Foo.tsx',
      },
      {
        code: `import { something } from 'other-package';`,
        filename: 'packages/loot-core/src/server/foo.ts',
      },
    ],
    invalid: [
      {
        code: `import { FaBeer } from 'react-icons/fa';`,
        filename: 'packages/desktop-client/src/components/Foo.tsx',
        errors: [{ messageId: 'bannedIconPackage' }],
      },
      {
        code: `import { HomeIcon } from '@heroicons/react/24/outline';`,
        filename: 'packages/component-library/src/Button.tsx',
        errors: [{ messageId: 'bannedIconPackage' }],
      },
      {
        code: `
export const SvgAdd = (props) => <svg {...props} />;
`,
        filename: 'packages/component-library/src/icons/v1/Add.tsx',
        errors: [{ messageId: 'iconWrapperMustUseLucide' }],
      },
      {
        code: `
import { Plus } from 'lucide-react';
export const SvgAdd = Plus;
`,
        filename: 'packages/component-library/src/icons/v0/Add.tsx',
        errors: [{ messageId: 'iconWrapperMustUseLucide' }],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
);
