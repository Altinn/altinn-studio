import { NumericFormat } from 'react-number-format';
import type { NumericFormatProps } from 'react-number-format';

import { expandExponent } from './expandExponent';
import { Input } from './Input';
import type { InputProps } from './Input';

export function NumericInput({
  value,
  ...props
}: Omit<NumericFormatProps, 'customInput' | 'size'> & InputProps) {
  return (
    <NumericFormat
      {...props}
      value={typeof value === 'string' ? expandExponent(value) : value}
      customInput={Input}
    />
  );
}
