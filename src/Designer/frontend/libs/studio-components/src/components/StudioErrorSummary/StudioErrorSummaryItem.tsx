import React from 'react';
import type { ReactElement } from 'react';
import { ErrorSummaryItem } from '@digdir/designsystemet-react';
import type { ErrorSummaryItemProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioErrorSummaryItemProps = WithoutAsChild<ErrorSummaryItemProps>;

export function StudioErrorSummaryItem({
  children,
  ...rest
}: StudioErrorSummaryItemProps): ReactElement {
  return <ErrorSummaryItem {...rest}>{children}</ErrorSummaryItem>;
}
