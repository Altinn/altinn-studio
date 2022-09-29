import React, { ChangeEvent } from 'react';
import { makeStyles, TextField } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { Autocomplete } from '@material-ui/lab';
import type { ISchemaState } from '../../types';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getRootNodes } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';

export interface IRefSelectProps {
  nodePointer: string;
  value: string;
  label: string;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (value: string) => void;
}

export const RefSelect = ({ nodePointer, onChange, value, label, fullWidth, readOnly }: IRefSelectProps) => {
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

  const definitions: UiSchemaNode[] = useSelector((state: ISchemaState) => getRootNodes(state.uiSchema, true));

  const domElementId = getDomFriendlyID(nodePointer, 'ref-select');
  return (
    <>
      <label htmlFor={domElementId}>{label}</label>
      <Autocomplete
        freeSolo={false}
        fullWidth={fullWidth}
        id={domElementId}
        disabled={readOnly}
        value={value?.replace('#/definitions/', '')}
        onChange={(event: ChangeEvent<unknown>, newValue: string) => onChange(newValue)}
        className={classes.root}
        disableClearable={true}
        options={definitions.map((node) => node.pointer)}
        renderInput={(params) => {
          (params.InputProps as any).disableUnderline = true;
          return <TextField {...params} />;
        }}
      />
    </>
  );
};
