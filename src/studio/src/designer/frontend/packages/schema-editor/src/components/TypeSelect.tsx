import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';

export interface ITypeSelectProps {
  id: string;
  itemType: string;
  onChange: (id: string, value: string) => void;
  readOnly?: boolean;
}

const useStyles = makeStyles({
  root: {
    width: '100%',
    minWidth: 104,
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    margin: 8,
  },
});

export const TypeSelect = (props: ITypeSelectProps) => {
  const classes = useStyles();
  const {
    id, itemType, onChange,
  } = props;
  const [value, setValue] = React.useState<string>(itemType || '');

  const onValueChange = (event: any) => {
    setValue(event.target.value);
    onChange(id, event.target.value);
  };

  return (
    <Select
      id={`type-select-${id}`}
      disabled={props.readOnly}
      value={value}
      onChange={onValueChange}
      className={classes.root}
      disableUnderline={true}
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
