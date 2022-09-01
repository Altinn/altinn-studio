import { MenuItem } from '@material-ui/core';
import React from 'react';
import type { CombinationKind } from '../../types';
import { StyledSelect } from './StyledSelect';
import { Option } from './helpers/helpers';

export interface ICombinationSelectProps {
  value?: string;
  onChange: (value: CombinationKind) => void;
  id: string;
  label: string;
  options: Option[];
}

export function CombinationSelect(props: ICombinationSelectProps) {
  const { value, onChange, id, label, options } = props;
  return (
    <StyledSelect
      fullWidth={true}
      value={value}
      id={id}
      label={label}
      onChange={(combination) => onChange(combination as CombinationKind)}
    >
      {options.map(({ value, label }) => (
        <MenuItem value={value} key={'combination-select-' + value}>
          {label}
        </MenuItem>
      ))}
    </StyledSelect>
  );
}
