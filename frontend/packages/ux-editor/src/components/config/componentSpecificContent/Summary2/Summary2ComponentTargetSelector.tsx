import React from 'react';
import { StudioCombobox } from '@studio/components';

type Summary2ComponentTargetIdProps = {
  label: string;
  value: string;
  options: { id: string; description: string }[];
  onValueChange: (value: string) => void;
};

export const Summmary2ComponentTargetSelector = ({
  label,
  value,
  options,
  onValueChange,
}: Summary2ComponentTargetIdProps) => {
  const invalidOption = Boolean(value) && !options.some((option) => option.id === value);
  return (
    <StudioCombobox
      size='small'
      label={label}
      value={value ? [value] : []}
      onValueChange={(v) => onValueChange(v[0])}
      error={invalidOption} // TODO: Add error message
      multiple={false}
    >
      {options.map((option) => (
        <StudioCombobox.Option value={option.id} key={option.id} description={option.description}>
          {option.id}
        </StudioCombobox.Option>
      ))}
      {value && invalidOption && (
        <StudioCombobox.Option disabled value={value} key={value}>
          {value}
        </StudioCombobox.Option>
      )}
    </StudioCombobox>
  );
};
