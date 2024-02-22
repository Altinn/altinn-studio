import React, { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Textfield } from '@digdir/design-system-react';
import classes from './EnumField.module.css';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';

export type EnumFieldProps = {
  value: string;
  readOnly?: boolean;
  isValid?: boolean;
  onChange: (value: string) => void;
  onDelete: () => void;
  onEnterKeyPress?: () => void;
  index: number;
};

export const EnumField = ({
  value,
  readOnly,
  isValid,
  onChange,
  onDelete,
  onEnterKeyPress,
  index,
}: EnumFieldProps) => {
  const [inputValue, setInputValue] = useState(value);
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  const { t } = useTranslation();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newValue: string = event.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const label = t('schema_editor.enum_value', { index });

  return (
    <div className={classes.root}>
      <Textfield
        label={label}
        hideLabel
        disabled={readOnly}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        error={!isValid}
      />
      <StudioButton
        title={t('schema_editor.delete_field')}
        aria-label={t('schema_editor.delete_field')}
        className={classes.delete}
        icon={<TrashIcon aria-hidden />}
        onClick={() => onDelete()}
        color='danger'
        variant='tertiary'
      />
    </div>
  );
};
