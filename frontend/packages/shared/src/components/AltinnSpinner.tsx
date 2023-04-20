import React from 'react';
import classes from './AltinnSpinner.module.css';
import { Spinner } from '@digdir/design-system-react';
import type { SpinnerProps } from '@digdir/design-system-react';

export type IAltinnSpinnerComponentProvidedProps = {
  spinnerText?: string;
  className?: string;
} & Pick<SpinnerProps, 'size' | 'variant'>;

export const AltinnSpinner = ({
  spinnerText,
  className,
  size = '1xLarge',
  variant = 'interaction',
}: IAltinnSpinnerComponentProvidedProps) => (
  <div className={className}>
    <Spinner
      title={spinnerText}
      size={size}
      variant={variant}
      className={classes.spinner}
    />
    {spinnerText && <div className={classes.spinnerText}>{spinnerText}</div>}
  </div>
);
