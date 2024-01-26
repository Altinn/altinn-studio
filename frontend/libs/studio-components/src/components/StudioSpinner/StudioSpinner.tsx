import type { HTMLAttributes } from 'react';
import React, { forwardRef, useId } from 'react';
import { Paragraph, Spinner } from '@digdir/design-system-react';
import type { SpinnerProps } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './StudioSpinner.module.css';

export type StudioSpinnerProps = {
  spinnerText?: string;
  size?: SpinnerProps['size'];
  variant?: SpinnerProps['variant'];
} & HTMLAttributes<HTMLDivElement>;

export const StudioSpinner = forwardRef<HTMLDivElement, StudioSpinnerProps>(
  ({ spinnerText, size = 'medium', variant = 'interaction', ...rest }, ref): JSX.Element => {
    const { t } = useTranslation();

    const spinnerDescriptionId = useId();

    return (
      <div className={classes.spinnerWrapper} ref={ref} {...rest}>
        <Spinner
          title={!spinnerText && t('general.loading')}
          size={size}
          variant={variant}
          aria-describedby={spinnerText && spinnerDescriptionId}
          data-testid='studio-spinner-test-id'
        />
        {spinnerText && (
          <Paragraph as='div' id={spinnerDescriptionId}>
            {spinnerText}
          </Paragraph>
        )}
      </div>
    );
  },
);

StudioSpinner.displayName = 'StudioSpinner';
