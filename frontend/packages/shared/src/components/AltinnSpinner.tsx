import React from 'react';
import classes from './AltinnSpinner.module.css';
import { Spinner } from '@digdir/design-system-react';
import type { SpinnerProps } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type IAltinnSpinnerComponentProvidedProps = {
  spinnerText?: string;
  className?: string;
} & Pick<SpinnerProps, 'size' | 'variant'>;

export const AltinnSpinner = ({
  spinnerText,
  className,
  size = '1xLarge',
  variant = 'interaction',
}: IAltinnSpinnerComponentProvidedProps) => {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <Spinner
        title={!spinnerText && t('general.loading')}
        size={size}
        variant={variant}
        className={classes.spinner}
      />
      {spinnerText && <div className={classes.spinnerText}>{spinnerText}</div>}
    </div>
  )
};
