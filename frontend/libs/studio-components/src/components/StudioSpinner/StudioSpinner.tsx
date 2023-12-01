import React, { HTMLAttributes, forwardRef, useId } from 'react';
import { Paragraph, Spinner } from '@digdir/design-system-react';
import type { SpinnerProps } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioCenter } from '../StudioCenter';

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
      <StudioCenter ref={ref} {...rest}>
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
      </StudioCenter>
    );
  },
);

StudioSpinner.displayName = 'StudioSpinner';
