import React from 'react';
import type { ReactElement } from 'react';
import { DetailsContent } from '@digdir/designsystemet-react';
import type { DetailsContentProps } from '@digdir/designsystemet-react';

export type StudioDetailsContentProps = DetailsContentProps;

export function StudioDetailsContent({ children, ...rest }: DetailsContentProps): ReactElement {
  return <DetailsContent {...rest}>{children}</DetailsContent>;
}
