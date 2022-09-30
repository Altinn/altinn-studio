import React, { KeyboardEvent, useEffect, useState } from 'react';
import { IconButton } from '@material-ui/core';
import { useDispatch } from 'react-redux';
import { DeleteOutline } from '@material-ui/icons';
import type { ILanguage } from '../../types';
import { getTranslation } from '../../utils/language';
import { setRequired } from '../../features/editor/schemaEditorSlice';
import { Checkbox, TextField } from '@altinn/altinn-design-system';
import { getDomFriendlyID, getUniqueNumber } from '../../utils/ui-schema-utils';
import classes from './PropertyItem.module.css';

export interface IPropertyItemProps {
  value: string;
  fullPath: string;
  language: ILanguage;
  required?: boolean;
  onChangeValue: (path: string, value: string) => void;
  onDeleteField?: (path: string, key: string) => void;
  readOnly?: boolean;
  onEnterKeyPress?: () => void;
}

export function PropertyItem(props: IPropertyItemProps) {

  const [value, setValue] = useState<string>(props.value || '');
  const dispatch = useDispatch();

  useEffect(() => setValue(props.value), [props.value]);
  const onChangeValue = (e: any) => setValue(e.target.value);

  const onBlur = (e: any) => {
    if (value !== props.value) {
      props.onChangeValue(props.fullPath, e.target.value);
    }
  };

  const onClickDelete = () => props.onDeleteField?.(props.fullPath, props.value);

  const onChangeRequired = (e: any) =>
    dispatch(
      setRequired({
        path: props.fullPath,
        required: e.target.checked,
      }),
    );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && props.onEnterKeyPress && props.onEnterKeyPress();

  const baseId = getDomFriendlyID(props.fullPath, '-key-');
  return (
    <div className={classes.root}>
      <span className={classes.nameInputCell}>
        <TextField
          id={`${baseId}-key-${getUniqueNumber()}`}
          value={value}
          autoFocus
          disabled={props.readOnly}
          onChange={onChangeValue}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </span>
      <Checkbox
        checked={props.required ?? false}
        onChange={onChangeRequired}
        name='checkedArray'
        label={getTranslation('required', props.language)}
      />
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
    </div>
  );
}
