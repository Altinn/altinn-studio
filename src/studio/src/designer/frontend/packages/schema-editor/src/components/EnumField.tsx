import * as React from 'react';
import { Grid, IconButton, makeStyles, TextField } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { getDomFriendlyID, getTranslation } from '../utils';
import { ILanguage } from '../types';

export interface IEnumFieldProps {
  path: string;
  value: string;
  language: ILanguage;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (value: string, oldValue?: string) => void;
  onDelete?: (path: string, key: string) => void;
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

export const EnumField = (props: IEnumFieldProps) => {
  const classes = useStyles();
  const [val, setVal] = React.useState(props.value);
  React.useEffect(() => {
    setVal(props.value);
  }, [props.value]);

  const onBlur = () => {
    props.onChange(val, props.value);
  };

  const onChange = (e: any) => {
    e.stopPropagation();
    setVal(e.target.value);
  };

  const baseId = getDomFriendlyID(props.path);
  return (
    <>
      <Grid item xs={8}>
        <TextField
          id={`${baseId}-enum-${props.value}`}
          className={classes.field}
          fullWidth={true}
          disabled={props.readOnly}
          value={val}
          onChange={onChange}
          onBlur={onBlur}
          InputProps={{
            disableUnderline: true,
          }}
        />

      </Grid>
      <Grid item xs={1} />
      { props.onDelete &&
      <Grid item xs={3}>
        <IconButton
          id={`${baseId}-delete-${props.value}`}
          aria-label={getTranslation('delete_field', props.language)}
          onClick={() => props.onDelete?.(props.path, props.value)}
          className={classes.delete}
        >
          <DeleteOutline/>
        </IconButton>
      </Grid>}
    </>);
};
