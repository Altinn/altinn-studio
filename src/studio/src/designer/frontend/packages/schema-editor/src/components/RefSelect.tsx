import * as React from 'react';
import { makeStyles, TextField } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { Autocomplete } from '@material-ui/lab';
import { ISchemaState } from '../types';

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
      marginTop: 4,
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
  const definitions: string[] = useSelector(
    (state: ISchemaState) => state.uiSchema.filter((s) => s.id.includes('#/definitions'))
      .map((d) => d.id.replace('#/definitions/', '')),
  );

  const onChangeValue = (
    event: React.ChangeEvent<{}>,
    val: unknown,
  ) => {
    if (!val) {
      return;
    }
    onChange(id, `#/definitions/${val as string}`);
  };

  return (
    <Autocomplete
      freeSolo={false}
      fullWidth={props.fullWidth}
      id={`ref-select-${id}`}
      disabled={props.readOnly}
      value={value?.replace('#/definitions/', '')}
      onChange={onChangeValue}
      className={classes.root}
      disableClearable={true}
      options={definitions}
      renderInput={(params) => {
        // eslint-disable-next-line no-param-reassign
        (params.InputProps as any).disableUnderline = true;
        return <TextField
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...params}
        />;
      }
      }
    />
  );
};
