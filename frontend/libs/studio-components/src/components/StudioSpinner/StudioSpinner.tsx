import React, { forwardRef, useId } from 'react';
import type { HTMLAttributes, ReactElement, Ref } from 'react';
import classes from './StudioSpinner.module.css';
import { Spinner } from '@digdir/designsystemet-react';
import type { SpinnerProps } from '@digdir/designsystemet-react';
import { StudioParagraph } from '../StudioParagraph';

export type StudioSpinnerProps = {
  spinnerTitle?: string;
  'data-size'?: SpinnerProps['data-size'];
  'aria-label'?: string;
} & HTMLAttributes<HTMLDivElement>;

function StudioSpinner(
  { spinnerTitle, 'data-size': dataSize, 'aria-label': ariaLabel, ...rest }: StudioSpinnerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const spinnerDescriptionId = useId();

  return (
    <div ref={ref} className={classes.spinnerWrapper} {...rest}>
      <Spinner
        data-size={dataSize}
        aria-label={ariaLabel}
        aria-describedby={spinnerTitle ? spinnerDescriptionId : undefined}
        data-testid='studio-spinner-test-id'
      />
      {spinnerTitle && <StudioParagraph id={spinnerDescriptionId}>{spinnerTitle}</StudioParagraph>}
    </div>
  );
}

const ForwardedStudioSpinner = forwardRef(StudioSpinner);

export { ForwardedStudioSpinner as StudioSpinner };
