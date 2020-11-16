import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';

export interface ITypeSelectProps {
  id: string;
  itemType: string;
  onChange: (id: string, value: string) => void;
}

const useStyles = makeStyles({
  root: {
    margin: 12,
    width: '100%',
  },
  select: {
    minWidth: 147,
  },
});

export const TypeSelect = (props: ITypeSelectProps) => {
  const classes = useStyles();
  const {id, itemType, onChange} = props;
  const [value, setValue] = React.useState<string>(itemType || '');

  const onValueChange = (event: any) => {
    setValue(event.target.value);
    onChange(id, event.target.value);
  }

  return (
    <Select
      id={`type-select-${id}`}
      value={value}
      onChange={onValueChange}
      className={classes.root}
      classes={{
        select: classes.select
      }}
    >
      <MenuItem value='string'>string</MenuItem>
      <MenuItem value='integer'>integer</MenuItem>
      <MenuItem value='number'>number</MenuItem>
      <MenuItem value='boolean'>boolean</MenuItem>
      <MenuItem value='array'>array</MenuItem>
      <MenuItem value='enum'>enum</MenuItem>
      <MenuItem value='object'>object</MenuItem>
    </Select>
  )
}
