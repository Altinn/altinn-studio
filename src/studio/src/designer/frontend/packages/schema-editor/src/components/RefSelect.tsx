import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { ISchemaState, UiSchemaItem } from '../types';

export interface IRefSelectProps {
  id: string;
  value: string;
  onChange: (id: string, value: string) => void;
}

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
  select: {
    minWidth: 90,
  },
});

export const RefSelect = (props: IRefSelectProps) => {
  const classes = useStyles();
  const {
    id, onChange,
  } = props;
  const [value, setValue] = React.useState<string>(props.value);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((s) => s.id.includes('#/definitions')));
  const onValueChange = (event: any) => {
    setValue(event.target.value);
    onChange(id, event.target.value);
  };

  return (
    <Select
      id={`ref-select-${id}`}
      value={value}
      onChange={onValueChange}
      className={classes.root}
      disableUnderline={true}
      classes={{
        select: classes.select,
      }}
    > { definitions?.map((d: UiSchemaItem) => <MenuItem key={d.id} value={d.id}>{d.id}</MenuItem>) }
    </Select>
  );
};
