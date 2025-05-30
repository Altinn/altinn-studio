import React from 'react';
import type { ReactElement } from 'react';
import { ErrorSummary } from '@digdir/designsystemet-react';
import type { ErrorSummaryProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioErrorSummaryProps = WithoutAsChild<ErrorSummaryProps>;

export function StudioErrorSummary({ children, ...rest }: StudioErrorSummaryProps): ReactElement {
  return <ErrorSummary {...rest}>{children}</ErrorSummary>;
}
