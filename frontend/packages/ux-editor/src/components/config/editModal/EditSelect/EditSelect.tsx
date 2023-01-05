import React from 'react';
import { Select } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../../componentConfig';

type EditSelectOption = {
  label: string;
  value: string;
};

export interface EditSelectProps extends Omit<IGenericEditComponent, 'language'> {
  optionKey: string;
  options: string[];
}
export const EditSelect = ({
  component,
  optionKey,
  options,
  handleComponentChange
}: EditSelectProps): JSX.Element => {
  const handleSelectChange = (value: string): void => {
    handleComponentChange({ ...component, [optionKey]: value });
  };

  const mappedOptions: EditSelectOption[] = options.map((option) => ({
    label: option,
    value: option
  }));

  return <Select options={mappedOptions} onChange={handleSelectChange} />;
};
