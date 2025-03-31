import React from 'react';
import type { ReactElement } from 'react';
import { Field } from '@digdir/designsystemet-react';
import type { FieldProps } from '@digdir/designsystemet-react';

export type StudioFieldProps = FieldProps;

export function StudioField({
  'data-size': dataSize = 'sm',
  children,
  ...rest
}: StudioFieldProps): ReactElement {
  return (
    <Field data-size={dataSize} {...rest}>
      {children}
    </Field>
  );
}
