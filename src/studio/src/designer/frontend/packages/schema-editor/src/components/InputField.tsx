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
import { getDomFriendlyID, getTranslation } from '../utils';
import { setRequired } from '../features/editor/schemaEditorSlice';

const useStyles = (readonly?: boolean) => makeStyles({
  field: {
    background: 'white',
    color: 'black',
    border: readonly ? '1px solid grey' : '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    margin: 12,
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
  label: {
    margin: 12,
  },
  delete: {
    marginLeft: '8px',
    padding: '12px',
  },
  checkBox: {
    marginTop: 4,
  },
});

export interface IInputFieldProps {
  label: string;
  fullPath: string;
  language: ILanguage;
  required?: boolean;
  onChangeKey: (path: string, oldKey: string, newKey: string) => void;
  onChangeRequired?: (path: string, required: boolean) => void;
  onDeleteField?: (path: string, key: string) => void;
  readOnly?: boolean;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles(props.readOnly)();

  const [label, setLabel] = React.useState<string>(props.label || '');
  const dispatch = useDispatch();
  React.useEffect(() => {
    setLabel(props.label);
  }, [props.label]);
  const onChangeKey = (e: any) => {
    setLabel(e.target.value);
  };

  const onBlurKey = (e: any) => {
    props.onChangeKey(props.fullPath, props.label, e.target.value);
  };

  const onClickDelete = () => {
    props.onDeleteField?.(props.fullPath, props.label);
  };
  const onChangeRequired = (e: any, checked: boolean) => {
    dispatch(setRequired({
      path: props.fullPath, key: props.label, required: checked,
    }));
  };
  const baseId = getDomFriendlyID(props.fullPath);
  return (
    <>
      <Grid item xs={4}>
        <FormControl>
          <Input
            id={`${baseId}-key-${label}`}
            value={label}
            disableUnderline={true}
            fullWidth
            disabled={props.readOnly}
            onChange={onChangeKey}
            onBlur={onBlurKey}
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
              checked={props.required} onChange={onChangeRequired}
              name='checkedArray'
            />}
            label={getTranslation('schema_editor.required', props.language)}
          />
        </FormControl>
      </Grid>
      <Grid item xs={2} />
      <Grid item xs={1}>
        { props.onDeleteField &&
        <IconButton
          id={`${baseId}-delete-${label}`}
          aria-label='Delete field'
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
