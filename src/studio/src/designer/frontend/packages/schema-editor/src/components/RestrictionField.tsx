import * as React from 'react';
import { Grid, IconButton, Input, makeStyles, TextField } from '@material-ui/core';
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
    width: 150,
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
  const [val, setVal] = React.useState(props.value);
  React.useEffect(() => {
    setVal(props.value);
  }, [props.value]);

  const onBlur = () => {
    props.onChangeKey(props.path, props.keyName, val);
  };

  const options = getRestrictions(props.type ?? '');
  const baseId = getDomFriendlyID(props.path);
  return (
    <>
      <Grid item xs={4}>
        <Autocomplete
          freeSolo={true}
          id={`${baseId}-${props.keyName}-key`}
          disabled={props.readOnly}
          value={props.keyName}
          onInputChange={(e, v) => setVal(v)}
          onBlur={onBlur}
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
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={4}><Input
        id={`${baseId}-${props.keyName}-value`}
        disabled={props.readOnly}
        className={classes.field}
        value={props.value}
        disableUnderline={true}
        onChange={(e) => props.onChangeValue(props.path, e.target.value, props.keyName)}
      />
      </Grid>
      { props.onDeleteField &&
      <Grid item xs={3}>
        <IconButton
          id={`${baseId}-delete-${props.keyName}`}
          aria-label='Delete field'
          onClick={() => props.onDeleteField?.(props.path, props.keyName)}
          className={classes.delete}
        >
          <DeleteOutline/>
        </IconButton>
      </Grid>}
    </>);
};
