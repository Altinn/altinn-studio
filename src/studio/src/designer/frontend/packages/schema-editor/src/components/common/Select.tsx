import React from 'react';
import { Option } from '../SchemaInspector/helpers/options';
import { Label } from './Label';
import classes from './Select.module.css';

export interface ISelectProps {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: Option[];
  value?: string;
}

export const Select = ({ id, label, onChange, options, value }: ISelectProps) =>  (
  <>
    <Label htmlFor={id}>{label}</Label>
    <select
      className={classes.select}
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </>
);
