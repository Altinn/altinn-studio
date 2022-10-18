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

export function PropertyItem({
  fullPath,
  inputId,
  language,
  onChangeValue,
  onDeleteField,
  onEnterKeyPress,
  readOnly,
  required,
  value,
}: IPropertyItemProps) {
  const [inputValue, setInputValue] = useState<string>(value || '');
  const dispatch = useDispatch();

  useEffect(() => setInputValue(value), [value]);
  const changeValueHandler: ChangeEventHandler<HTMLInputElement> = (e) => setInputValue(e.target.value);

  const onBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    if (inputValue !== value) {
      onChangeValue(fullPath, e.target.value);
    }
  };

  const deleteHandler = () => onDeleteField?.(fullPath, value);

  const changeRequiredHandler: ChangeEventHandler<HTMLInputElement> = (e) =>
    dispatch(
      setRequired({
        path: fullPath,
        required: e.target.checked,
      }),
    );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  return (
    <div className={classes.root}>
      <span className={classes.nameInputCell}>
        <TextField
          id={inputId}
          value={inputValue}
          disabled={readOnly}
          onChange={changeValueHandler}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </span>
      <Checkbox
        checked={required ?? false}
        disabled={readOnly}
        onChange={changeRequiredHandler}
        name='checkedArray'
        label={getTranslation('required', language)}
      />
      <IconButton
        aria-label={getTranslation('delete_field', language)}
        onClick={deleteHandler}
        className={classes.delete}
      >
        <DeleteOutline />
      </IconButton>
    </div>
  );
}
