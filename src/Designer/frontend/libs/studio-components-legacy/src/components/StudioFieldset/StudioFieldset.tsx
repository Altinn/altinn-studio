import React, { forwardRef } from 'react';
import type { FieldsetProps } from '@digdir/designsystemet-react';
import { Fieldset } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioFieldsetProps = WithoutAsChild<FieldsetProps>;

/**
 * @deprecated use `StudioFieldset` from `@studio/components` instead
 */
export const StudioFieldset = forwardRef<HTMLFieldSetElement, StudioFieldsetProps>((props, ref) => {
  return <Fieldset size='sm' {...props} ref={ref} />;
});

StudioFieldset.displayName = 'StudioFieldset';
