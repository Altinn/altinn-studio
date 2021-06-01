import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';

export interface ITypeSelectProps {
  id: string;
  itemType: string;
  onChange: (id: string, value: string) => void;
  readOnly?: boolean;
  fullWidth?: boolean;
  label?: string;
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

export const TypeSelect = (props: ITypeSelectProps) => {
  const classes = useStyles();
  const {
    id, itemType, onChange,
  } = props;
  const onValueChange = (event: any) => {
    onChange(id, event.target.value);
  };

  return (
    <Select
      id={`type-select-${id}`}
      disabled={props.readOnly}
      label={props.label}
      value={itemType || ''}
      onChange={onValueChange}
      className={classes.root}
      disableUnderline={true}
      fullWidth={props.fullWidth}
    >
      <MenuItem value='string'>string</MenuItem>
      <MenuItem value='integer'>integer</MenuItem>
      <MenuItem value='number'>number</MenuItem>
      <MenuItem value='boolean'>boolean</MenuItem>
      <MenuItem value='array'>array</MenuItem>
      <MenuItem value='enum'>enum</MenuItem>
      <MenuItem value='object'>object</MenuItem>
    </Select>
  );
};
