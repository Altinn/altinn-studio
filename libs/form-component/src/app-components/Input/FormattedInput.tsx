import { PatternFormat } from 'react-number-format';
import type { PatternFormatProps } from 'react-number-format';

import { Input } from './Input';
import type { InputProps } from './Input';

export function FormattedInput(
  props: Omit<PatternFormatProps, 'customInput' | 'size'> & InputProps,
) {
  return <PatternFormat {...props} customInput={Input} />;
}
