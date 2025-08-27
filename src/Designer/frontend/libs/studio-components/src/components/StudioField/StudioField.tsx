import React from 'react';
import type { ReactElement } from 'react';
import { Field } from '@digdir/designsystemet-react';
import type { FieldProps } from '@digdir/designsystemet-react';

export type StudioFieldProps = FieldProps;

export function StudioField({ children, ...rest }: StudioFieldProps): ReactElement {
  return <Field {...rest}>{children}</Field>;
}
