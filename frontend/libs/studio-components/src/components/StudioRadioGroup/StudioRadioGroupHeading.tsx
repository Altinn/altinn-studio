import React from 'react';
import type { ReactElement } from 'react';
import { StudioFieldset } from '../StudioFieldset';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioRadioGroupHeadingProps = {
  label: string;
  description?: string;
  tagText?: string;
  required?: boolean;
};

export function StudioRadioGroupHeading({
  label,
  description,
  tagText,
  required = false,
}: StudioRadioGroupHeadingProps): ReactElement {
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
