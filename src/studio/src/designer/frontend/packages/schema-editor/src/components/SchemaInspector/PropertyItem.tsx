import React, { ChangeEventHandler, FocusEventHandler, KeyboardEvent, useEffect, useState } from 'react';
import { IconButton } from '@material-ui/core';
import { useDispatch } from 'react-redux';
import { DeleteOutline } from '@material-ui/icons';
import type { ILanguage } from '../../types';
import { getTranslation } from '../../utils/language';
import { setRequired } from '../../features/editor/schemaEditorSlice';
import { Checkbox, TextField } from '@altinn/altinn-design-system';
import classes from './PropertyItem.module.css';

export interface IPropertyItemProps {
  fullPath: string;
  inputId: string;
  language: ILanguage;
  onChangeValue: (path: string, value: string) => void;
  onDeleteField: (path: string, key: string) => void;
  onEnterKeyPress: () => void;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}

export function PropertyItem(props: IPropertyItemProps) {
  const [value, setValue] = useState<string>(props.value || '');
  const dispatch = useDispatch();

  useEffect(() => setValue(props.value), [props.value]);
  const onChangeValue: ChangeEventHandler<HTMLInputElement> = (e) => setValue(e.target.value);

  const onBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    if (value !== props.value) {
      props.onChangeValue(props.fullPath, e.target.value);
    }
  };

  const onClickDelete = () => props.onDeleteField?.(props.fullPath, props.value);

  const onChangeRequired: ChangeEventHandler<HTMLInputElement> = (e) =>
    dispatch(
      setRequired({
        path: props.fullPath,
        required: e.target.checked,
      }),
    );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && props.onEnterKeyPress && props.onEnterKeyPress();

  return (
    <div className={classes.root}>
      <span className={classes.nameInputCell}>
        <TextField
          id={props.inputId}
          value={value}
          disabled={props.readOnly}
          onChange={onChangeValue}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </span>
      <Checkbox
        checked={props.required ?? false}
        disabled={props.readOnly}
        onChange={onChangeRequired}
        name='checkedArray'
        label={getTranslation('required', props.language)}
      />
      <IconButton
        aria-label={getTranslation('delete_field', props.language)}
        onClick={onClickDelete}
        className={classes.delete}
      >
        <DeleteOutline />
      </IconButton>
    </div>
  );
}
