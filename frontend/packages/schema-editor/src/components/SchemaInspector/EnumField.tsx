import type { KeyboardEvent } from 'react';
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
  const [val, setVal] = useState(value);
  useEffect(() => {
    setVal(value);
  }, [value]);
  const { t } = useTranslation();

  const onBlur = () => {
    onChange(val, value);
  };

  const handleChange = (e: any) => {
    e.stopPropagation();
    setVal(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && onEnterKeyPress && onEnterKeyPress();

  const id = `${baseId}-enum-${value}`;

  return (
    <div className={classes.root}>
      <Textfield
        label={t('schema_editor.textfield_label', { id })}
        hideLabel
        disabled={readOnly}
        value={val}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        error={!isValid}
      />
      {onDelete && (
        <Button
          title={t('schema_editor.delete_field')}
          className={classes.delete}
          icon={<TrashIcon />}
          id={`${baseId}-delete-${value}`}
          onClick={() => onDelete?.(path, value)}
          color='danger'
          variant='tertiary'
        />
      )}
    </div>
  );
};
