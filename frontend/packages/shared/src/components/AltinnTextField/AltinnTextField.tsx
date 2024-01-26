import type { TextfieldProps } from '@digdir/design-system-react';
import { Textfield } from '@digdir/design-system-react';
import React from 'react';
import cn from 'classnames';
import classes from './AltinnTextField.module.css';

export type AltinnTextFieldProps = TextfieldProps & {
  withAsterisk?: boolean;
};

export const AltinnTextField = ({ withAsterisk, ...rest }: AltinnTextFieldProps) => (
  <span className={cn(withAsterisk && classes.withAsterisk)}>
    <Textfield {...rest} />
  </span>
);
