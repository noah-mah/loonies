import { render } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { createLucideIcon } from './createLucideIcon';

describe('createLucideIcon', () => {
  it('renders a Lucide icon with width/height props', () => {
    const SvgAdd = createLucideIcon(Plus);
    const { container } = render(<SvgAdd width={16} height={16} />);
    const svg = container.querySelector('svg');

    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');
  });
});
