import React from 'react';
import type { ReactElement } from 'react';
import { ErrorSummaryLink } from '@digdir/designsystemet-react';
import type { ErrorSummaryLinkProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioErrorSummaryLinkProps = WithoutAsChild<ErrorSummaryLinkProps>;

export function StudioErrorSummaryLink({
  children,
  ...rest
}: StudioErrorSummaryLinkProps): ReactElement {
  return <ErrorSummaryLink {...rest}>{children}</ErrorSummaryLink>;
}
