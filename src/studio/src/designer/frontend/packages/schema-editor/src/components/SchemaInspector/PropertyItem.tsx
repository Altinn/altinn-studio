import React, { KeyboardEvent, useEffect, useState } from 'react';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  makeStyles,
} from '@material-ui/core';
import { useDispatch } from 'react-redux';
import { DeleteOutline } from '@material-ui/icons';
import type { ILanguage } from '../../types';
import { getDomFriendlyID, getUniqueNumber } from '../../utils/schema';
import { getTranslation } from '../../utils/language';
import { setRequired } from '../../features/editor/schemaEditorSlice';
import { TextField } from "@altinn/altinn-design-system";

const useStyles = makeStyles({
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

export interface IPropertyItemProps {
  value: string;
  fullPath: string;
  language: ILanguage;
  required?: boolean;
  onChangeValue: (path: string, value: string) => void;
  onChangeRequired?: (path: string, required: boolean) => void;
  onDeleteField?: (path: string, key: string) => void;
  readOnly?: boolean;
  onEnterKeyPress?: () => void;
}

export function PropertyItem(props: IPropertyItemProps) {
  const classes = useStyles();

  const [value, setValue] = useState<string>(props.value || '');
  const dispatch = useDispatch();
  useEffect(() => {
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
    dispatch(
      setRequired({
        path: props.fullPath,
        key: props.value,
        required: checked,
      }),
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && props.onEnterKeyPress && props.onEnterKeyPress();

  const baseId = getDomFriendlyID(props.fullPath);
  return (
    <>
      <Grid item xs={6}>
        <FormControl>
          <TextField
            id={`${baseId}-key-${getUniqueNumber()}`}
            value={value}
            autoFocus
            disabled={props.readOnly}
            onChange={onChangeValue}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        </FormControl>
      </Grid>
      <Grid item xs={4}>
        <FormControl>
          <FormControlLabel
            className={classes.checkBox}
            control={<Checkbox checked={props.required ?? false} onChange={onChangeRequired} name='checkedArray' />}
            label={getTranslation('required', props.language)}
          />
        </FormControl>
      </Grid>
      <Grid item xs={2}>
        {props.onDeleteField && (
          <IconButton
            id={`${baseId}-delete-${getUniqueNumber()}`}
            aria-label={getTranslation('delete_field', props.language)}
            onClick={onClickDelete}
            className={classes.delete}
          >
            <DeleteOutline />
          </IconButton>
        )}
      </Grid>
    </>
  );
}
