import { MenuItem } from '@material-ui/core';
import * as React from 'react';
import { CombinationKind, ILanguage } from '../types';
import { getTranslation } from '../utils';
import { StyledSelect } from './StyledSelect';

export interface ICombinationSelectProps {
  value?: string;
  onChange: (value: CombinationKind ) => void;
  id: string;
  language: ILanguage;
}

export function CombinationSelect(props: ICombinationSelectProps) {
  const { value, onChange, id, language } = props;
  return (
    <StyledSelect
      fullWidth={true}
      value={value}
      id={id}
      label={getTranslation('type', language)}
      onChange={(value) => onChange(value as CombinationKind)}
    >
      <MenuItem value='allOf'>{getTranslation('all_of', language)}</MenuItem>
      <MenuItem value='anyOf'>{getTranslation('any_of', language)}</MenuItem>
      <MenuItem value='oneOf'>{getTranslation('one_of', language)}</MenuItem>
    </StyledSelect>
  )
}
