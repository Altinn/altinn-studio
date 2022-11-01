import React, { ReactNode } from 'react';
import { Select } from '@mui/material';
import { Label } from './Label';
import classes from './StyledSelect.module.css';

export interface IStyledSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  fullWidth?: boolean;
  label?: string;
  children: ReactNode;
}

export function StyledSelect({ id, label, value, onChange, readOnly, fullWidth, children }: IStyledSelectProps) {
  const onValueChange = (event: any) => {
    onChange(event.target.value);
  };

  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        disabled={readOnly}
        label={label}
        value={value || ''}
        onChange={onValueChange}
        className={classes.root}
        disableUnderline={true}
        fullWidth={fullWidth}
      >
        {children}
      </Select>
    </>
  );
}
