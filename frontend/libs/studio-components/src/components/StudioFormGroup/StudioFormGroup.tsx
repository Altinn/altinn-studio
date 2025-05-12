import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { StudioFieldset, type StudioFieldsetProps } from '../StudioFieldset';

export type StudioFormGroupProps = StudioFieldsetProps & {
  requiredText?: string;
  required?: boolean;
};

function StudioFormGroup(
  { children, requiredText, required, ...rest }: StudioFormGroupProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <StudioFieldset {...rest} ref={ref}>
      <StudioFieldset.Legend></StudioFieldset.Legend>
    </StudioFieldset>
  );
}

const ForwardedStudioFormGroup = forwardRef(StudioFormGroup);

export { ForwardedStudioFormGroup as StudioFormGroup };
