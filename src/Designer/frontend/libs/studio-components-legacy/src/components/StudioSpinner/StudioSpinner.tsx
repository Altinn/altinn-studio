import type { HTMLAttributes } from 'react';
import React, { forwardRef, useId } from 'react';
import { Paragraph, Spinner } from '@digdir/designsystemet-react';
import type { SpinnerProps } from '@digdir/designsystemet-react';
import classes from './StudioSpinner.module.css';

export type StudioSpinnerProps = {
  spinnerTitle: string;
  showSpinnerTitle?: boolean;
  size?: SpinnerProps['size'];
  variant?: SpinnerProps['variant'];
} & HTMLAttributes<HTMLDivElement>;

type ParagraphSize = Exclude<SpinnerProps['size'], '2xs' | 'xxsmall' | 'xl' | 'xlarge'>;

type SizeLimits = {
  upperLimit: ParagraphSize;
  lowerLimit: ParagraphSize;
};

/**
 * @deprecated use `StudioSpinner` from `@studio/components` instead
 */
export const StudioSpinner = forwardRef<HTMLDivElement, StudioSpinnerProps>(
  (
    { spinnerTitle, showSpinnerTitle = false, size = 'medium', variant = 'interaction', ...rest },
    ref,
  ): JSX.Element => {
    const spinnerDescriptionId = useId();
    const paragraphSize: ParagraphSize = clampSizeWithinLimits(size, {
      upperLimit: 'lg',
      lowerLimit: 'xs',
    });

    return (
      <div className={classes.spinnerWrapper} ref={ref} {...rest}>
        <Spinner
          title={!showSpinnerTitle && spinnerTitle}
          size={size}
          variant={variant}
          aria-describedby={showSpinnerTitle ? spinnerDescriptionId : null}
          data-testid='studio-spinner-test-id'
        />

        {showSpinnerTitle && (
          <Paragraph size={paragraphSize} id={spinnerDescriptionId}>
            {spinnerTitle}
          </Paragraph>
        )}
      </div>
    );
  },
);

export function clampSizeWithinLimits(
  size: SpinnerProps['size'],
  limits: SizeLimits,
): ParagraphSize {
  const sizes: SpinnerProps['size'][] = [
    '2xs',
    'xxsmall',
    'xs',
    'xsmall',
    'sm',
    'small',
    'md',
    'medium',
    'lg',
    'large',
    'xl',
    'xlarge',
  ];

  const sizeIndex = sizes.indexOf(size);
  const lowerLimitIndex = sizes.indexOf(limits.lowerLimit);
  const upperLimitIndex = sizes.indexOf(limits.upperLimit);

  if (sizeIndex < lowerLimitIndex) {
    return limits.lowerLimit;
  } else if (sizeIndex > upperLimitIndex) {
    return limits.upperLimit;
  } else {
    return size as ParagraphSize;
  }
}

StudioSpinner.displayName = 'StudioSpinner';
