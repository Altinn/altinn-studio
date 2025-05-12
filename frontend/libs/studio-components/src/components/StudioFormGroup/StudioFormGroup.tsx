import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { StudioFieldset, type StudioFieldsetProps } from '../StudioFieldset';

export type StudioFormGroupProps = StudioFieldsetProps & {
  legend: string;
  description?: string;
  requiredText?: string;
  required?: boolean;
};

function StudioFormGroup(
  { children, legend, description, requiredText, required, ...rest }: StudioFormGroupProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <StudioFieldset {...rest} ref={ref}>
      <StudioFieldset.Legend>
        {legend}
        {/* ADD TAG */}
      </StudioFieldset.Legend>
      {description && <StudioFieldset.Description>{description}</StudioFieldset.Description>}
      {children}
    </StudioFieldset>
  );
}

const ForwardedStudioFormGroup = forwardRef(StudioFormGroup);

export { ForwardedStudioFormGroup as StudioFormGroup };
