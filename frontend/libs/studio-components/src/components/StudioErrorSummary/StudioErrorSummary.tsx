import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { ErrorSummary } from '@digdir/designsystemet-react';
import type { ErrorSummaryProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioErrorSummaryProps = WithoutAsChild<ErrorSummaryProps>;

function StudioErrorSummary(
  { children, ...rest }: StudioErrorSummaryProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <ErrorSummary ref={ref} {...rest}>
      {children}
    </ErrorSummary>
  );
}

const ForwardStudioErrorSummary = forwardRef(StudioErrorSummary);

export { ForwardStudioErrorSummary as StudioErrorSummary };
