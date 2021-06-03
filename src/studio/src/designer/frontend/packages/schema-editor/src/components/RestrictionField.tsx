import * as React from 'react';
import { IconButton, Input, makeStyles, TextField } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { Autocomplete } from '@material-ui/lab';
import { getDomFriendlyID, getRestrictions } from '../utils';
import { ILanguage } from '../types';

export interface IRestrictionFieldProps {
  type?: string;
  path: string;
  keyName: string;
  value: string;
  readonly?: boolean;
  language: ILanguage;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChangeKey: (id: string, oldKey: string, newKey: string) => void;
  onChangeValue: (id: string, key: string, value: string) => void;
  onDeleteField?: (path: string, key: string) => void;
}

export const RestrictionField = (props: IRestrictionFieldProps) => {
  const classes = makeStyles({
    root: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    delete: {
      marginLeft: '8px',
      marginTop: '12px',
      padding: '12px',
    },
    field: {
      background: 'white',
      color: 'black',
      border: '1px solid #006BD8',
      boxSsizing: 'border-box',
      padding: 4,
      margin: 12,
      minWidth: 150,
      maxWidth: 200,
      '&.Mui-disabled': {
        background: '#f4f4f4',
        color: 'black',
        border: '1px solid #6A6A6A',
        boxSizing: 'border-box',
      },
    },
  })();

  const handleChangeKey = (
    event: React.ChangeEvent<{}>,
    val: string,
  ) => {
    if (!val) {
      return;
    }
    props.onChangeKey(props.path, props.keyName, val);
  };

  const options = getRestrictions(props.type ?? '');
  const baseId = getDomFriendlyID(props.path);
  return (
    <span className={classes.root}>
      <Autocomplete
        freeSolo={true}
        id={`${baseId}-${props.keyName}-key`}
        disabled={props.readOnly}
        value={props.keyName}
        onChange={handleChangeKey}
        className={classes.field}
        disableClearable={true}
        options={options ?? []}
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
      <Input
        id={`${baseId}-${props.keyName}-value`}
        disabled={props.readOnly}
        className={classes.field}
        value={props.value}
        disableUnderline={true}
        onChange={(e) => props.onChangeValue(props.path, e.target.value, props.keyName)}
      />
      { props.onDeleteField &&
      <IconButton
        id={`${baseId}-delete-${props.keyName}`}
        aria-label='Delete field'
        onClick={() => props.onDeleteField?.(props.path, props.keyName)}
        className={classes.delete}
      >
        <DeleteOutline/>
      </IconButton>}
    </span>);
};
