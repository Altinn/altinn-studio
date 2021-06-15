import * as React from 'react';
import { makeStyles, MenuItem, Select } from '@material-ui/core';
import { ILanguage } from '../types';
import { getDomFriendlyID, getTranslation } from '../utils';

export interface ITypeSelectProps {
  id: string;
  value?: string;
  language: ILanguage;
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
    id, value, onChange,
  } = props;
  const onValueChange = (event: any) => {
    onChange(id, event.target.value);
  };

  return (
    <Select
      id={`${getDomFriendlyID(id)}-type-select`}
      disabled={props.readOnly}
      label={props.label}
      value={value}
      onChange={onValueChange}
      className={classes.root}
      disableUnderline={true}
      fullWidth={props.fullWidth}
    >
      <MenuItem value='string'>{getTranslation('string', props.language)}</MenuItem>
      <MenuItem value='integer'>{getTranslation('integer', props.language)}</MenuItem>
      <MenuItem value='number'>{getTranslation('number', props.language)}</MenuItem>
      <MenuItem value='boolean'>{getTranslation('boolean', props.language)}</MenuItem>
      <MenuItem value='object'>{getTranslation('object', props.language)}</MenuItem>
    </Select>
  );
};
