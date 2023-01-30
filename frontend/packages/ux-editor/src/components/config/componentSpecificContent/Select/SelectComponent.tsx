import React from 'react';
import { Select, FieldSet } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';

type Option = {
  label: string;
  value: string;
};

export interface SelectComponentProps extends IGenericEditComponent {
  label: string;
  optionKey: string;
  options: Option[];
  defaultValue?: string;
}
export const SelectComponent = ({
  label,
  component,
  optionKey,
  options,
  defaultValue,
  handleComponentChange,
}: SelectComponentProps): JSX.Element => {
  const handleSelectChange = (value: string): void => {
    handleComponentChange({ ...component, [optionKey]: value });
  };

  return (
    <FieldSet>
      <Select label={label} options={options} onChange={handleSelectChange} value={defaultValue} />
    </FieldSet>
  );
};
