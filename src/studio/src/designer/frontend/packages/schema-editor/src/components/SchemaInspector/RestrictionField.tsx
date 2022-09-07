import React, { BaseSyntheticEvent } from 'react';
import { Grid, Input, makeStyles } from '@material-ui/core';
import { getDomFriendlyID } from '../../utils/schema';
import { Label } from './Label';

const useStyles = makeStyles({
  delete: {
    marginLeft: '8px',
    padding: '12px',
  },
  field: {
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    '&.Mui-disabled': {
      background: '#f4f4f4',
      color: 'black',
      border: '1px solid #6A6A6A',
      boxSizing: 'border-box',
    },
  },
});
export interface IRestrictionFieldProps {
  keyName: string;
  label: string;
  onChangeValue: (id: string, key: string, value: string) => void;
  onReturn?: (e: BaseSyntheticEvent) => void;
  path: string;
  readOnly?: boolean;
  value?: string;
}

export const RestrictionField = ({ keyName, label, onChangeValue, path, readOnly, value }: IRestrictionFieldProps) => {
  const classes = useStyles();

  const baseId = getDomFriendlyID(path);

  return (
    <>
      <Grid item xs={12}>
        <Label>{label}</Label>
        <Input
          inputProps={{ 'aria-label': label }}
          fullWidth={true}
          id={`${baseId}-${keyName}-value`}
          disabled={readOnly}
          className={classes.field}
          value={value ?? ''}
          disableUnderline={true}
          onChange={(e) => onChangeValue(path, e.target.value, keyName)}
        />
      </Grid>
    </>
  );
};
