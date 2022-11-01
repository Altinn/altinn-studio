import React, { KeyboardEvent, useEffect, useState } from 'react';
import { IconButton } from '../common/IconButton';
import { getTranslation } from '../../utils/language';
import type { ILanguage } from '../../types';
import { TextField } from '@altinn/altinn-design-system';
import classes from './EnumField.module.css';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { IconImage } from '../common/Icon';

export interface IEnumFieldProps {
  path: string;
  value: string;
  language: ILanguage;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (value: string, oldValue?: string) => void;
  onDelete?: (path: string, key: string) => void;
  onEnterKeyPress?: () => void;
}

export const EnumField = (props: IEnumFieldProps) => {
  const [val, setVal] = useState(props.value);
  useEffect(() => {
    setVal(props.value);
  }, [props.value]);

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
      />
      {props.onDelete && (
        <IconButton
          ariaLabel={getTranslation('delete_field', props.language)}
          className={classes.delete}
          icon={IconImage.Wastebucket}
          id={`${baseId}-delete-${props.value}`}
          onClick={() => props.onDelete?.(props.path, props.value)}
        />
      )}
    </div>
  );
};
