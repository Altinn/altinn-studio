import React from 'react';
import type { ReactElement } from 'react';
import { ErrorSummaryList } from '@digdir/designsystemet-react';
import type { ErrorSummaryListProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioErrorSummaryListProps = WithoutAsChild<ErrorSummaryListProps>;

export function StudioErrorSummaryList({
  children,
  ...rest
}: StudioErrorSummaryListProps): ReactElement {
  return <ErrorSummaryList {...rest}>{children}</ErrorSummaryList>;
}
