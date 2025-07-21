import React from 'react';
import type { ReactElement } from 'react';
import { StudioFieldset } from '../StudioFieldset';
import type { StudioFieldsetProps } from '../StudioFieldset';
import type { StudioLabelWrapperProps } from '../StudioLabelWrapper/StudioLabelWrapper';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioCheckboxGroupProps = StudioFieldsetProps &
  Pick<StudioLabelWrapperProps, 'tagText' | 'required'>;

export function StudioCheckboxGroup({
  children,
  legend,
  required,
  tagText,
  ...rest
}: StudioCheckboxGroupProps): ReactElement {
  return (
    <StudioFieldset
      legend={
        <StudioLabelWrapper required={required} tagText={tagText}>
          {legend}
        </StudioLabelWrapper>
      }
      {...rest}
    >
      {children}
    </StudioFieldset>
  );
}
