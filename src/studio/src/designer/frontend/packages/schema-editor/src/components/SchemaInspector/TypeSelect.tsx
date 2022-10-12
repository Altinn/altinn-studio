import { MenuItem } from '@material-ui/core';
import React from 'react';
import { Option } from './helpers/options';
import { FieldType } from '@altinn/schema-model';
import { StyledSelect } from '../common/StyledSelect';

export interface IFieldTypeSelect {
  value?: string;
  onChange: (value: FieldType) => void;
  id: string;
  options: Option[];
  label: string;
}

export function TypeSelect({ value, onChange, id, options, label }: IFieldTypeSelect) {
  return (
    <StyledSelect label={label} fullWidth={true} value={value} id={id} onChange={(type) => onChange(type as FieldType)}>
      {options.map(({ value, label }) => (
        <MenuItem value={value} key={'type-select-' + value}>
          {label}
        </MenuItem>
      ))}
    </StyledSelect>
  );
}
