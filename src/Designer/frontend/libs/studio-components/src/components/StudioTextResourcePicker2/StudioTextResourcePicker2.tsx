import React from 'react';
import type { StudioSelectProps } from '@studio/components';
import { StudioSelect } from '@studio/components';
import type { TextResource } from '@studio/pure-functions/src/types/TextResource';
import type { Override } from '../../types/Override';

export type StudioTextResourcePicker2Props = Override<
  {
    label: string;
    noTextResourceOptionLabel: string;
    textResources: TextResource[];
    textResourceId?: string;
    onReferenceChange: (id?: string) => void;
  },
  Omit<StudioSelectProps, 'onChange' | 'value' | 'children'>
>;

export function StudioTextResourcePicker2({
  label,
  noTextResourceOptionLabel,
  textResources,
  textResourceId,
  onReferenceChange,
  ...rest
}: StudioTextResourcePicker2Props): React.ReactElement {
  return (
    <StudioSelect
      {...rest}
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
}

StudioTextResourcePicker2.displayName = 'StudioTextResourcePicker2';
