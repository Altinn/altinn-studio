import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { Button, Textfield } from '@digdir/design-system-react';
import classes from './EnumField.module.css';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@altinn/icons';

export type EnumFieldProps = {
  path: string;
  value: string;
  readOnly?: boolean;
  isValid?: boolean;
  onChange: (value: string, oldValue?: string) => void;
  onDelete?: (path: string, key: string) => void;
  onEnterKeyPress?: () => void;
  baseId: string;
};

export const EnumField = ({
  path,
  value,
  readOnly,
  isValid,
  onChange,
  onDelete,
  onEnterKeyPress,
  baseId,
}: EnumFieldProps) => {
  const [inputValue, setInputValue] = useState(value);
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  const { t } = useTranslation();

  const onBlur = () => {
    onChange(inputValue, value);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setInputValue(event.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const label = t('schema_editor.textfield_label', { id: `${baseId}-enum-${value}` });

  return (
    <div className={classes.root}>
      <Textfield
        label={label}
        hideLabel
        disabled={readOnly}
        value={inputValue}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        error={!isValid}
      />
      {onDelete && (
        <Button
          title={t('schema_editor.delete_field')}
          aria-label={t('schema_editor.delete_field')}
          className={classes.delete}
          icon={<TrashIcon aria-hidden />}
          id={`${baseId}-delete-${value}`}
          onClick={() => onDelete?.(path, value)}
          color='danger'
          variant='tertiary'
        />
      )}
    </div>
  );
};
