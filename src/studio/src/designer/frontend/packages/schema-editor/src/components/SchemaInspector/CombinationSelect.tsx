import React from 'react';
import { MenuItem } from '@material-ui/core';
import type { CombinationKind } from '../../types';
import { StyledSelect } from './StyledSelect';
import { Option } from './helpers/options';

export interface ICombinationSelectProps {
  value?: string;
  onChange: (value: CombinationKind) => void;
  id: string;
  label: string;
  options: Option[];
}

export function CombinationSelect({ value, onChange, id, label, options }: ICombinationSelectProps) {
  return (
    <StyledSelect
      fullWidth={true}
      value={value}
      id={id}
      label={label}
      onChange={(combination) => onChange(combination as CombinationKind)}
    >
      {options.map(({ value, label }) => (
        <MenuItem value={value} key={'combination-select-' + value} role={'menuitem'}>
          {label}
        </MenuItem>
      ))}
    </StyledSelect>
  );
}
