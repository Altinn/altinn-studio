import * as React from 'react';
import { makeStyles, Select } from '@material-ui/core';

export interface ITypeSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  fullWidth?: boolean;
  label?: string;
  children: React.ReactNode;
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

export const StyledSelect = (props: ITypeSelectProps) => {
  const classes = useStyles();
  const {
    id, value, onChange,
  } = props;

  const onValueChange = (event: any) => {
    onChange(event.target.value);
  };

  return (
    <Select
      id={id}
      disabled={props.readOnly}
      label={props.label}
      value={value}
      onChange={onValueChange}
      className={classes.root}
      disableUnderline={true}
      fullWidth={props.fullWidth}
    >
      {props.children}
    </Select>
  );
};
