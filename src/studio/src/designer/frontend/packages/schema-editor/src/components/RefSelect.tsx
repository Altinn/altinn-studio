import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { ISchemaState, UiSchemaItem } from '../types';

export interface IRefSelectProps {
  id: string;
  value: string;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (id: string, value: string) => void;
}

export const RefSelect = (props: IRefSelectProps) => {
  const classes = makeStyles({
    root: {
      background: 'white',
      color: 'black',
      border: '1px solid #006BD8',
      boxSsizing: 'border-box',
      padding: 4,
      margin: 12,
      '&.Mui-disabled': {
        background: '#f4f4f4',
        color: 'black',
        border: '1px solid #6A6A6A',
        boxSizing: 'border-box',
      },
    },
  })();

  const {
    id, onChange, value,
  } = props;
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((s) => s.id.includes('#/definitions')));

  const onChangeValue = (event: React.ChangeEvent<{
    name?: string;
    value: unknown;
}>) => {
    onChange(id, event.target.value as string);
  };

  return (
    <Select
      fullWidth={props.fullWidth}
      id={`ref-select-${id}`}
      disabled={props.readOnly}
      value={value}
      onChange={onChangeValue}
      className={classes.root}
      disableUnderline={true}
    > { definitions?.map((d: UiSchemaItem) => <MenuItem key={d.id} value={d.id}>{d.id}</MenuItem>) }
    </Select>
  );
};
