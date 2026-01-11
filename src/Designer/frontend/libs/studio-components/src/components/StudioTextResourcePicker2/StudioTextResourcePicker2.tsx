import React from 'react';
import { StudioSelect } from '@studio/components';
import type { TextResource } from 'libs/studio-pure-functions/src/types/TextResource';

export type StudioTextResourcePicker2Props = {
  label: string;
  noTextResourceOptionLabel: string;
  textResources: TextResource[];
  textResourceId?: string;
  onReferenceChange: (id?: string) => void;
};

export const StudioTextResourcePicker2 = ({
  label,
  noTextResourceOptionLabel,
  textResources,
  textResourceId,
  onReferenceChange,
}: StudioTextResourcePicker2Props): React.ReactElement => {
  return (
    <StudioSelect
      label={label}
      onChange={(event) =>
        onReferenceChange(event.target.value === '' ? undefined : event.target.value)
      }
      value={textResourceId ?? ''}
    >
      <StudioSelect.Option value=''>{noTextResourceOptionLabel}</StudioSelect.Option>
      {textResources.map((option) => (
        <StudioSelect.Option title={option.value} key={option.id} value={option.id}>
          {option.id}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
