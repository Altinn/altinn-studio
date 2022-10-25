import React, { ChangeEventHandler, FocusEventHandler, KeyboardEvent, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ILanguage } from '../../types';
import { getTranslation } from '../../utils/language';
import { setRequired } from '../../features/editor/schemaEditorSlice';
import { Checkbox, TextField } from '@altinn/altinn-design-system';
import classes from './PropertyItem.module.css';
import { IconButton } from '../common/IconButton';
import { IconImage } from '../common/Icon';

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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const t = (key: string) => getTranslation(key, language);

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
        label={t('required')}
      />
      <IconButton ariaLabel={t('delete_field')} icon={IconImage.Wastebucket} onClick={deleteHandler} />
    </div>
  );
}
