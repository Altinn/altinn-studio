import { render, screen } from '@testing-library/react';

import { FormattedInput } from './FormattedInput';

describe('FormattedInput', () => {
  it('formats the value according to the pattern', () => {
    render(
      <FormattedInput
        aria-label='Phone'
        format='### ## ###'
        value='12345678'
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('123 45 678');
  });
});
