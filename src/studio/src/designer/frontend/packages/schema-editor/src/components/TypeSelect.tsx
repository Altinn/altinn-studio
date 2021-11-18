import { MenuItem } from '@material-ui/core';
import * as React from 'react';
import { FieldType, ILanguage } from '../types';
import { getTranslation } from '../utils';
import { StyledSelect } from './StyledSelect';

export interface IFieldTypeSelect {
  value?: string;
  onChange: (value: FieldType ) => void;
  id: string;
  language: ILanguage;
}

export function TypeSelect(props: IFieldTypeSelect) {
  const { value, onChange, id, language } = props;
  return (
    <StyledSelect
      label={getTranslation('type', language)}
      fullWidth={true}
      value={value}
      id={id}
      onChange={(value) => onChange(value as FieldType)}
    >
      <MenuItem value='string'>{getTranslation('string', language)}</MenuItem>
      <MenuItem value='integer'>{getTranslation('integer', language)}</MenuItem>
      <MenuItem value='number'>{getTranslation('number', language)}</MenuItem>
      <MenuItem value='boolean'>{getTranslation('boolean', language)}</MenuItem>
      <MenuItem value='object'>{getTranslation('object', language)}</MenuItem>
    </StyledSelect>
  )
}
