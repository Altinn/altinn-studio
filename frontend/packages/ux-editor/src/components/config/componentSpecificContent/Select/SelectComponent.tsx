import React from 'react';
import { Select, FieldSet } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../../componentConfig';

type SelectOption = {
  label: string;
  value: string;
};

export interface SelectComponentProps extends IGenericEditComponent {
  optionKey: string;
  options: string[];
}
export const SelectComponent = ({
  component,
  optionKey,
  options,
  handleComponentChange
}: SelectComponentProps): JSX.Element => {
  const mappedOptions: SelectOption[] = options.map((option) => ({
    label: option,
    value: option
  }));

  const handleSelectChange = (value: string): void => {
    handleComponentChange({ ...component, [optionKey]: value });
  };

  return (
    <FieldSet>
      <Select options={mappedOptions} onChange={handleSelectChange} />
    </FieldSet>
  );
};
