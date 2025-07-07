import React from 'react';
import type { ReactElement } from 'react';
import { StudioFieldset } from '../StudioFieldset';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioCheckboxGroupHeadingProps = {
  label: string;
  description?: string;
  tagText?: string;
  required?: boolean;
};

export function StudioCheckboxGroupHeading({
  label,
  description,
  tagText,
  required = false,
}: StudioCheckboxGroupHeadingProps): ReactElement {
  return (
    <>
      <StudioFieldset.Legend>
        <StudioLabelWrapper required={required} tagText={tagText}>
          {label}
        </StudioLabelWrapper>
      </StudioFieldset.Legend>
      <StudioFieldset.Description>{description}</StudioFieldset.Description>
    </>
  );
}
