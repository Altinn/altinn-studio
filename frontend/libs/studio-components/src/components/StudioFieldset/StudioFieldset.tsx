import React, { forwardRef } from 'react';
import type { FieldsetProps } from '@digdir/designsystemet-react';
import { Fieldset } from '@digdir/designsystemet-react';

export type StudioFieldsetProps = FieldsetProps;

export const StudioFieldset = forwardRef<HTMLFieldSetElement, StudioFieldsetProps>((props, ref) => {
  return <Fieldset size='sm' {...props} ref={ref} />;
});

StudioFieldset.displayName = 'StudioFieldset';
