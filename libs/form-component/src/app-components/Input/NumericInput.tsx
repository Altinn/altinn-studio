import { NumericFormat } from 'react-number-format';
import type { NumericFormatProps } from 'react-number-format';

import { Input } from './Input';
import type { InputProps } from './Input';

export function NumericInput(props: Omit<NumericFormatProps, 'customInput' | 'size'> & InputProps) {
  return <NumericFormat {...props} customInput={Input} />;
}
