import React from 'react';
import type { ReactElement } from 'react';
import { ErrorSummaryHeading } from '@digdir/designsystemet-react';
import type { ErrorSummaryHeadingProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioErrorSummaryHeadingProps = WithoutAsChild<ErrorSummaryHeadingProps>;

export function StudioErrorSummaryHeading({
  children,
  ...rest
}: StudioErrorSummaryHeadingProps): ReactElement {
  return <ErrorSummaryHeading {...rest}>{children}</ErrorSummaryHeading>;
}
