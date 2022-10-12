import React, { ChangeEvent } from 'react';
import { TextField } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { Autocomplete } from '@material-ui/lab';
import type { ISchemaState } from '../../types';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getRootNodes } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './RefSelect.module.css';
import { Label } from '../common/Label';

export interface IRefSelectProps {
  nodePointer: string;
  value: string;
  label: string;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (value: string) => void;
}

export const RefSelect = ({ nodePointer, onChange, value, label, fullWidth, readOnly }: IRefSelectProps) => {
  const definitions: UiSchemaNode[] = useSelector((state: ISchemaState) => getRootNodes(state.uiSchema, true));
  const domElementId = getDomFriendlyID(nodePointer, 'ref-select');
  return (
    <>
      <Label htmlFor={domElementId}>{label}</Label>
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
