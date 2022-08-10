import React from 'react';
import {
  Grid,
  IconButton,
  Input,
  makeStyles,
  TextField,
} from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { Autocomplete } from '@material-ui/lab';
import { getTranslation } from '../utils/language';
import { getDomFriendlyID, getRestrictions } from '../utils/schema';
import type { ILanguage } from '../types';

export interface IRestrictionFieldProps {
  type?: string;
  path: string;
  keyName: string;
  value: string;
  language: ILanguage;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChangeKey: (id: string, oldKey: string, newKey: string) => void;
  onChangeValue: (id: string, key: string, value: string) => void;
  onDeleteField?: (path: string, key: string) => void;
  onReturn?: (e: React.BaseSyntheticEvent) => void;
}

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

export const RestrictionField = (props: IRestrictionFieldProps) => {
  const classes = useStyles();
  const [keyName, setKeyName] = React.useState(props.keyName);
  React.useEffect(() => {
    setKeyName(props.keyName);
  }, [props.keyName]);

  const onBlur = () => {
    props.onChangeKey(props.path, props.keyName, keyName);
  };
  const onInputChange = (e: any, v: any) => {
    setKeyName(v);
  };

  const onChangeKey = (e: any, v: any) => {
    e.stopPropagation();
    setKeyName(v);
  };

  const onValueKeyDown = (e: any) => {
    if (props.onReturn && e.keyCode === 13) {
      props.onReturn(e);
    }
  };

  const options = getRestrictions(props.type ?? '');
  const baseId = getDomFriendlyID(props.path);
  return (
    <>
      <Grid item xs={4}>
        <Autocomplete
          selectOnFocus={true}
          freeSolo={true}
          id={`${baseId}-${props.keyName}-key`}
          disabled={props.readOnly}
          value={keyName}
          onInputChange={onInputChange}
          onChange={onChangeKey}
          onBlur={onBlur}
          className={classes.field}
          disableClearable={true}
          options={options ?? []}
          getOptionLabel={(option) => getTranslation(option, props.language)}
          renderInput={(params) => {
            // eslint-disable-next-line no-param-reassign
            (params.InputProps as any).disableUnderline = true;
            return (
              <TextField
                autoFocus
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...params}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={4}>
        <Input
          id={`${baseId}-${props.keyName}-value`}
          disabled={props.readOnly}
          className={classes.field}
          value={props.value}
          disableUnderline={true}
          onKeyDown={onValueKeyDown}
          onChange={(e) =>
            props.onChangeValue(props.path, e.target.value, props.keyName)
          }
        />
      </Grid>
      {props.onDeleteField && (
        <Grid item xs={3}>
          <IconButton
            id={`${baseId}-delete-${props.keyName}`}
            aria-label={getTranslation('delete_field', props.language)}
            onClick={() => props.onDeleteField?.(props.path, props.keyName)}
            className={classes.delete}
          >
            <DeleteOutline />
          </IconButton>
        </Grid>
      )}
    </>
  );
};
