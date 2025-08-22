import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { StudioFieldset, type StudioFieldsetProps } from '../StudioFieldset';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioFormGroupProps = StudioFieldsetProps & {
  tagText?: string;
  required?: boolean;
};

function StudioFormGroup(
  { children, legend, tagText, required, ...rest }: StudioFormGroupProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  return (
    <StudioFieldset
      legend={
        <StudioLabelWrapper required={required} tagText={tagText}>
          {legend}
        </StudioLabelWrapper>
      }
      {...rest}
      ref={ref}
    >
      {children}
    </StudioFieldset>
  );
}

const ForwardedStudioFormGroup = forwardRef(StudioFormGroup);

export { ForwardedStudioFormGroup as StudioFormGroup };
