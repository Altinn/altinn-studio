import React from 'react';
import { Option } from '../SchemaInspector/helpers/options';
import { Label } from './Label';
import classes from './Select.module.css';

export interface SelectProps {
  className?: string;
  emptyOptionLabel?: string;
  hideLabel?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: Option[];
  value?: string;
}

export const Select = ({
  className,
  emptyOptionLabel,
  hideLabel,
  id,
  label,
  onChange,
  options,
  value,
}: SelectProps) => {
  const allOptions = emptyOptionLabel === undefined ? options : [{value: '', label: emptyOptionLabel}, ...options];
  return (
    <span className={className}>
      {!hideLabel && <Label htmlFor={id}>{label}</Label>}
      <select
        aria-label={hideLabel ? label : undefined}
        className={classes.select}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {allOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </span>
  );
};
