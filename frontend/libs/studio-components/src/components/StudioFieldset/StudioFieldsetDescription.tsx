import React from 'react';
import type { ReactElement } from 'react';
import { FieldsetDescription } from '@digdir/designsystemet-react';
import type { FieldsetDescriptionProps } from '@digdir/designsystemet-react';

export type StudioFieldsetDescriptionProps = FieldsetDescriptionProps;

export function StudioFieldsetDescription({
  children,
  ...rest
}: StudioFieldsetDescriptionProps): ReactElement {
  return <FieldsetDescription {...rest}>{children}</FieldsetDescription>;
}
