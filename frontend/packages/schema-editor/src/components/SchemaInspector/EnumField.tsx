import type { KeyboardEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { IconButton } from '../common/IconButton';
import { LegacyTextField as TextField } from '@digdir/design-system-react';
import classes from './EnumField.module.css';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { IconImage } from '../common/Icon';
import { useTranslation } from 'react-i18next';

export interface IEnumFieldProps {
  path: string;
  value: string;
  readOnly?: boolean;
  fullWidth?: boolean;
  isValid?: boolean;
  onChange: (value: string, oldValue?: string) => void;
  onDelete?: (path: string, key: string) => void;
  onEnterKeyPress?: () => void;
}

export const EnumField = (props: IEnumFieldProps) => {
  const [val, setVal] = useState(props.value);
  useEffect(() => {
    setVal(props.value);
  }, [props.value]);
  const { t } = useTranslation();

  const onBlur = () => {
    props.onChange(val, props.value);
  };

  const onChange = (e: any) => {
    e.stopPropagation();
    setVal(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && props.onEnterKeyPress && props.onEnterKeyPress();

  const baseId = getDomFriendlyID(props.path);
  return (
    <div className={classes.root}>
      <TextField
        id={`${baseId}-enum-${props.value}`}
        disabled={props.readOnly}
        value={val}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus
        isValid={props.isValid}
      />
      {props.onDelete && (
        <IconButton
          ariaLabel={t('schema_editor.delete_field')}
          className={classes.delete}
          icon={IconImage.Wastebucket}
          id={`${baseId}-delete-${props.value}`}
          onClick={() => props.onDelete?.(props.path, props.value)}
        />
      )}
    </div>
  );
};
