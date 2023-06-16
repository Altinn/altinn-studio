import type { ChangeEventHandler, FocusEventHandler, KeyboardEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { TextField } from '@digdir/design-system-react';
import { Checkbox, Select } from '@digdir/design-system-react';
import classes from './PropertyItem.module.css';
import { IconButton } from '../common/IconButton';
import { IconImage } from '../common/Icon';
import { getTypeOptions } from './helpers/options';
import type { FieldType } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { setRequired } from '@altinn/schema-model';

export interface IPropertyItemProps {
  fullPath: string;
  inputId: string;
  onChangeType: (path: string, type: FieldType) => void;
  onChangeValue: (path: string, value: string) => void;
  onDeleteField: (path: string, key: string) => void;
  onEnterKeyPress: () => void;
  readOnly?: boolean;
  required?: boolean;
  type: FieldType;
  value: string;
}

export function PropertyItem({
  fullPath,
  inputId,
  onChangeType,
  onChangeValue,
  onDeleteField,
  onEnterKeyPress,
  readOnly,
  required,
  type,
  value,
}: IPropertyItemProps) {
  const [inputValue, setInputValue] = useState<string>(value || '');
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  useEffect(() => setInputValue(value), [value]);
  const changeValueHandler: ChangeEventHandler<HTMLInputElement> = (e) =>
    setInputValue(e.target.value);

  const onBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    if (inputValue !== value) {
      onChangeValue(fullPath, e.target.value);
    }
  };

  const deleteHandler = () => onDeleteField?.(fullPath, value);

  const changeRequiredHandler: ChangeEventHandler<HTMLInputElement> = (e) =>
    mutate(
      setRequired(data, {
        path: fullPath,
        required: e.target.checked,
      })
    );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const { t } = useTranslation();

  return (
    <>
      <div className={`${classes.nameInputCell} ${classes.gridItem}`}>
        <TextField
          aria-label={t('schema_editor.field_name')}
          id={inputId}
          value={inputValue}
          disabled={readOnly}
          onChange={changeValueHandler}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className={`${classes.typeSelectCell} ${classes.gridItem}`}>
        <Select
          hideLabel
          inputId={`${inputId}-typeselect`}
          label={t('schema_editor.type')}
          onChange={(fieldType) => onChangeType(fullPath, fieldType as FieldType)}
          options={getTypeOptions(t)}
          value={type}
        />
      </div>
      <span className={`${classes.requiredCheckCell} ${classes.gridItem}`}>
        <Checkbox
          checked={required ?? false}
          disabled={readOnly}
          hideLabel
          label={t('schema_editor.required')}
          name='checkedArray'
          onChange={changeRequiredHandler}
        />
      </span>
      <IconButton
        ariaLabel={t('schema_editor.delete_field')}
        icon={IconImage.Wastebucket}
        onClick={deleteHandler}
      />
    </>
  );
}
