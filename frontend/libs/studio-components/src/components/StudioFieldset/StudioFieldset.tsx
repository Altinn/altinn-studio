import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Fieldset } from '@digdir/designsystemet-react';
import type { FieldsetProps } from '@digdir/designsystemet-react';

export type StudioFieldsetProps = FieldsetProps;

function StudioFieldset(
  { children, ...rest }: StudioFieldsetProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <Fieldset {...rest} ref={ref}>
      {children}
    </Fieldset>
  );
}
const ForwardedStudioFieldset = forwardRef(StudioFieldset);

export { ForwardedStudioFieldset as StudioFieldset };
