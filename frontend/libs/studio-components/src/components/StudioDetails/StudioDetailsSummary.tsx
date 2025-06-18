import React from 'react';
import type { ReactElement } from 'react';
import { DetailsSummary } from '@digdir/designsystemet-react';
import type { DetailsSummaryProps } from '@digdir/designsystemet-react';

export type StudioDetailsSummaryProps = DetailsSummaryProps;

export function StudioDetailsSummary({
  children,
  ...rest
}: StudioDetailsSummaryProps): ReactElement {
  return <DetailsSummary {...rest}>{children}</DetailsSummary>;
}
