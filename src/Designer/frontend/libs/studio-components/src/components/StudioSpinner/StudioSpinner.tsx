import React, { forwardRef, useId } from 'react';
import type { ReactElement, Ref } from 'react';
import classes from './StudioSpinner.module.css';
import cn from 'classnames';
import { Spinner } from '@digdir/designsystemet-react';
import type { SpinnerProps } from '@digdir/designsystemet-react';
import { StudioParagraph } from '../StudioParagraph';

export type StudioSpinnerProps = {
  spinnerTitle?: string;
} & SpinnerProps;

function StudioSpinner(
  { spinnerTitle, className: givenClassName, ...rest }: StudioSpinnerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const spinnerDescriptionId = useId();

  return (
    <div ref={ref} className={cn(givenClassName, classes.spinnerWrapper)}>
      <Spinner
        aria-describedby={spinnerTitle ? spinnerDescriptionId : undefined}
        data-testid='studio-spinner-test-id'
        {...rest}
      />
      {spinnerTitle && <StudioParagraph id={spinnerDescriptionId}>{spinnerTitle}</StudioParagraph>}
    </div>
  );
}

const ForwardedStudioSpinner = forwardRef(StudioSpinner);

export { ForwardedStudioSpinner as StudioSpinner };
