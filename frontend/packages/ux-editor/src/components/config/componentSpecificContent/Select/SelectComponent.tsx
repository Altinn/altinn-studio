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
  value: string;
}
export const SelectComponent = ({
  label,
  component,
  optionKey,
  options,
  defaultValue,
  value,
  handleComponentChange,
}: SelectComponentProps): JSX.Element => {
  const handleSelectChange = (newValue: string): void => {
    handleComponentChange({ ...component, [optionKey]: newValue });
  };

  return (
    <FieldSet>
      <Select
        label={label}
        options={options}
        onChange={handleSelectChange}
        value={value || defaultValue}
      />
    </FieldSet>
  );
};
