import * as React from 'react';
import { makeStyles,
  FormControl,
  Input,
  IconButton,
  FormControlLabel,
  Checkbox,
  Grid } from '@material-ui/core';
import { useDispatch } from 'react-redux';
import { DeleteOutline } from '@material-ui/icons';
import { ILanguage } from '../types';
import { getDomFriendlyID, getTranslation, getUniqueNumber } from '../utils';
import { setRequired } from '../features/editor/schemaEditorSlice';

const useStyles = (readonly?: boolean) => makeStyles({
  field: {
    background: 'white',
    color: 'black',
    border: readonly ? '1px solid grey' : '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    '&.Mui-disabled': {
      background: '#f4f4f4',
      color: 'black',
      border: '1px solid #6A6A6A',
      boxSizing: 'border-box',
    },
  },
  inline: {
    display: 'inline-block',
  },
  delete: {
    marginLeft: '8px',
    padding: '12px',
  },
  checkBox: {
    marginTop: 4,
    '& .Mui-focusVisible': {
      background: 'gray',
    },
  },
});

export interface IInputFieldProps {
  value: string;
  fullPath: string;
  language: ILanguage;
  required?: boolean;
  onChangeValue: (path: string, value: string) => void;
  onChangeRequired?: (path: string, required: boolean) => void;
  onDeleteField?: (path: string, key: string) => void;
  readOnly?: boolean;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles(props.readOnly)();

  const [value, setValue] = React.useState<string>(props.value || '');
  const dispatch = useDispatch();
  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const onChangeValue = (e: any) => {
    setValue(e.target.value);
  };

  const onBlur = (e: any) => {
    if (value !== props.value) {
      props.onChangeValue(props.fullPath, e.target.value);
    }
  };

  const onClickDelete = () => {
    props.onDeleteField?.(props.fullPath, props.value);
  };
  const onChangeRequired = (e: any, checked: boolean) => {
    dispatch(setRequired({
      path: props.fullPath, key: props.value, required: checked,
    }));
  };
  const baseId = getDomFriendlyID(props.fullPath);
  return (
    <>
      <Grid item xs={4}>
        <FormControl>
          <Input
            id={`${baseId}-key-${getUniqueNumber()}`}
            value={value}
            disableUnderline={true}
            fullWidth
            autoFocus
            disabled={props.readOnly}
            onChange={onChangeValue}
            onBlur={onBlur}
            className={classes.field}
          />
        </FormControl>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={4}>
        <FormControl>
          <FormControlLabel
            className={classes.checkBox}
            control={<Checkbox
              checked={props.required ?? false} onChange={onChangeRequired}
              name='checkedArray'
            />}
            label={getTranslation('required', props.language)}
          />
        </FormControl>
      </Grid>
      <Grid item xs={3}>
        { props.onDeleteField &&
        <IconButton
          id={`${baseId}-delete-${getUniqueNumber()}`}
          aria-label={getTranslation('delete_field', props.language)}
          onClick={onClickDelete}
          className={classes.delete}
        >
          <DeleteOutline/>
        </IconButton>
        }
      </Grid>
    </>
  );
}
