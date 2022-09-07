import React, { ReactNode } from 'react';
import { makeStyles, Select } from '@material-ui/core';

export interface IStyledSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  fullWidth?: boolean;
  label?: string;
  children: ReactNode;
}

const useStyles = makeStyles({
  root: {
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    marginTop: 4,
    '&.Mui-disabled': {
      background: '#f4f4f4',
      color: 'black',
      border: '1px solid #6A6A6A',
      boxSizing: 'border-box',
    },
  },
});

export function StyledSelect({ id, label, value, onChange, readOnly, fullWidth, children }: IStyledSelectProps) {
  const classes = useStyles();

  const onValueChange = (event: any) => {
    onChange(event.target.value);
  };

  return (
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
  );
}
