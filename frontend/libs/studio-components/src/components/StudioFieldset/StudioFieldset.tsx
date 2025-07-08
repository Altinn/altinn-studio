import React, { forwardRef } from 'react';
import type { ReactElement, Ref, ReactNode } from 'react';
import { Fieldset } from '@digdir/designsystemet-react';
import type { FieldsetProps } from '@digdir/designsystemet-react';

export type StudioFieldsetProps = FieldsetProps & {
  legend?: ReactNode;
  description?: ReactNode;
};

function StudioFieldset(
  { children, legend, description, ...rest }: StudioFieldsetProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <Fieldset {...rest} ref={ref}>
      <Fieldset.Legend>{legend}</Fieldset.Legend>
      {description && <Fieldset.Description>{description}</Fieldset.Description>}
      {children}
    </Fieldset>
  );
}
const ForwardedStudioFieldset = forwardRef(StudioFieldset);

export { ForwardedStudioFieldset as StudioFieldset };
