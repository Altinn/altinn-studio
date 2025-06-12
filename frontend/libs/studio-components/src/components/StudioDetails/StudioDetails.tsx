import React from 'react';
import type { ReactElement } from 'react';
import { Details } from '@digdir/designsystemet-react';
import type { DetailsProps } from '@digdir/designsystemet-react';

export type StudioDetailsProps = DetailsProps;

export function StudioDetails({ children, ...rest }: StudioDetailsProps): ReactElement {
  return <Details {...rest}>{children}</Details>;
}
