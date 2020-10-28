import React from 'react';
import { makeStyles, TextField } from '@material-ui/core';

const useStyles = makeStyles({
  root: {
    minWidth: 400,
  }
});

export interface IInputFieldProps {
  value: string;
  label: string;
  fullPath: string;
  onChange: (value: string, path: string) => void;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles();
  const [value, setValue] = React.useState<string>(props.value || '');

  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const onChange = (e: any) => {
    setValue(e.target.value);
    props.onChange(e.target.value, props.fullPath);
  }

  return (
    <TextField
      value={value}
      label={props.label}
      onChange={onChange}
      className={classes.root}
    />
  )
}