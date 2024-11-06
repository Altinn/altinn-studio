import React from 'react';
import { PatternFormat } from 'react-number-format';
import type { PatternFormatProps } from 'react-number-format';

import { Input } from 'src/app-components/Input/Input';
import type { InputProps } from 'src/app-components/Input/Input';

export function FormattedInput(props: Omit<PatternFormatProps, 'customInput' | 'size'> & InputProps) {
  return (
    <PatternFormat
      {...props}
      customInput={Input}
    />
  );
}
