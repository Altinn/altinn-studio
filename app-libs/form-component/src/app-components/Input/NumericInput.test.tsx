import { render, screen } from '@testing-library/react';

import { NumericInput } from './NumericInput';

describe('NumericInput', () => {
  it('formats the value with a thousand separator', () => {
    render(
      <NumericInput
        aria-label='Amount'
        thousandSeparator=' '
        value='1234567'
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('1 234 567');
  });
});
