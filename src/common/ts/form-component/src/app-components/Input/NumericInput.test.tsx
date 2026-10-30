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

  it('formats a value in exponent notation as plain decimals', () => {
    render(
      <NumericInput
        aria-label='Amount'
        thousandSeparator=' '
        decimalSeparator=','
        decimalScale={2}
        suffix=' kr'
        value='1.270667891713e-16'
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('0,00 kr');
  });
});
