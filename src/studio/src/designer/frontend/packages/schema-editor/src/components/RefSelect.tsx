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
    minWidth: 200,
  },
});

export const RefSelect = (props: IRefSelectProps) => {
  const classes = useStyles();
  const {
    id, onChange,
  } = props;
  const [value, setValue] = React.useState<string>(props.value);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((s) => s.id.includes('#/definitions')));

  const onChangeValue = (event: React.ChangeEvent<{
    name?: string;
    value: unknown;
}>) => {
    setValue(event.target.value as string);
    onChange(id, event.target.value as string);
  };

  return (
    <Select
      id={`ref-select-${id}`}
      value={value}
      onChange={onChangeValue}
      className={classes.root}
      disableUnderline={true}
    > { definitions?.map((d: UiSchemaItem) => <MenuItem key={d.id} value={d.id}>{d.id}</MenuItem>) }
    </Select>
  );
};
