import React, { forwardRef, useEffect, useId } from 'react';
import type { ReactElement, Ref } from 'react';
import classes from './StudioSpinner.module.css';
import cn from 'classnames';
import { Spinner } from '@digdir/designsystemet-react';
import type { SpinnerProps } from '@digdir/designsystemet-react';
import { StudioParagraph } from '../StudioParagraph';

export type StudioSpinnerProps = {
  spinnerTitle?: ReactElement | string;
  delayMs?: number;
} & SpinnerProps;

function StudioSpinner(
  { spinnerTitle, className: givenClassName, delayMs, ...rest }: StudioSpinnerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement | null {
  const spinnerDescriptionId = useId();
  const [loaded, setLoaded] = React.useState(!delayMs);

  useEffect(() => {
    if (!delayMs) return;

    const timer = setTimeout(() => {
      setLoaded(true);
    }, delayMs);

    return (): void => clearTimeout(timer);
  }, [delayMs]);

  return loaded ? (
    <div ref={ref} className={cn(givenClassName, classes.spinnerWrapper)}>
      <Spinner
        aria-describedby={spinnerTitle ? spinnerDescriptionId : undefined}
        data-testid='studio-spinner-test-id'
        {...rest}
      />
      {spinnerTitle && <StudioParagraph id={spinnerDescriptionId}>{spinnerTitle}</StudioParagraph>}
    </div>
  ) : null;
}

const ForwardedStudioSpinner = forwardRef(StudioSpinner);

export { ForwardedStudioSpinner as StudioSpinner };
