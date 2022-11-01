import React, { BaseSyntheticEvent, ChangeEvent } from 'react';
import { TextField } from '@altinn/altinn-design-system';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { Label } from '../common/Label';

export interface IRestrictionFieldProps {
  className?: string;
  keyName: string;
  label: string;
  onChangeValue: (id: string, key: string, value: string) => void;
  onReturn?: (e: BaseSyntheticEvent) => void;
  path: string;
  readOnly?: boolean;
  value?: string;
}

export const RestrictionField = ({
  className,
  keyName,
  label,
  onChangeValue,
  path,
  readOnly,
  value,
}: IRestrictionFieldProps) => {
  const fieldId = getDomFriendlyID(path, { suffix: `${keyName}-value` });
  const handleChange = ({ target }: ChangeEvent) => {
    const element = target as HTMLInputElement;
    if (element.value !== value) {
      onChangeValue(path, keyName, element.value);
    }
  };
  return (
    <div className={className}>
      <Label htmlFor={fieldId}>{label}</Label>
      <TextField id={fieldId} value={value ?? ''} onChange={handleChange} aria-label={label} readOnly={readOnly} />
    </div>
  );
};
