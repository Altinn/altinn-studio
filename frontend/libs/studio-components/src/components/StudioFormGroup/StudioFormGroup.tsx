import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { StudioFieldset, type StudioFieldsetProps } from '../StudioFieldset';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioFormGroupProps = StudioFieldsetProps & {
  legend: string;
  description?: string;
  tagText?: string;
  required?: boolean;
};

function StudioFormGroup(
  { children, legend, description, tagText, required, ...rest }: StudioFormGroupProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <StudioFieldset {...rest} ref={ref}>
      <StudioFieldset.Legend>
        <StudioLabelWrapper required={required} tagText={tagText}>
          {legend}
        </StudioLabelWrapper>
      </StudioFieldset.Legend>
      {description && <StudioFieldset.Description>{description}</StudioFieldset.Description>}
      {children}
    </StudioFieldset>
  );
}

const ForwardedStudioFormGroup = forwardRef(StudioFormGroup);

export { ForwardedStudioFormGroup as StudioFormGroup };
