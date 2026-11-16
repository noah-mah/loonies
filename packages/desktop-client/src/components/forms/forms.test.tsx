import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormField, FormLabel } from '#components/forms';

describe('form fields', () => {
  it('renders a Coss field label for schedule and payee forms', () => {
    render(
      <FormField>
        <FormLabel title="Schedule Name" htmlFor="name-field" />
      </FormField>,
    );

    const label = screen.getByText('Schedule Name');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'name-field');
    expect(label.closest('[data-slot="field"]')).not.toBeNull();
  });
});
