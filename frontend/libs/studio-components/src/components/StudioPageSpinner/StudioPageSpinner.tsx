import type { HTMLAttributes, ReactElement, Ref } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioPageSpinner.module.css';
import { StudioCenter } from '../StudioCenter';
import { StudioSpinner } from '../StudioSpinner';

export type StudioPageSpinnerProps = {
  spinnerTitle: string;
  showSpinnerTitle?: boolean;
} & HTMLAttributes<HTMLDivElement>;

function StudioPageSpinner(
  { spinnerTitle, showSpinnerTitle = false }: StudioPageSpinnerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <StudioCenter ref={ref} className={classes.container}>
      <StudioSpinner
        spinnerTitle={spinnerTitle}
        data-size='xl'
        className={classes.spinnerText}
        aria-hidden={showSpinnerTitle ? 'true' : undefined}
      />
    </StudioCenter>
  );
}

StudioPageSpinner.displayName = 'StudioPageSpinner';

const ForwardedStudioPageSpinner = forwardRef(StudioPageSpinner);

export { ForwardedStudioPageSpinner as StudioPageSpinner };
