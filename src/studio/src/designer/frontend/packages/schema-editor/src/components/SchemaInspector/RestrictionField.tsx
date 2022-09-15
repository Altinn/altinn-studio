import React, { BaseSyntheticEvent } from 'react';
import { getDomFriendlyID } from '../../utils/schema';
import { Label } from './Label';
import { TextField } from "@altinn/altinn-design-system";

export interface IRestrictionFieldProps {
  keyName: string;
  label: string;
  onChangeValue: (id: string, key: string, value: string) => void;
  onReturn?: (e: BaseSyntheticEvent) => void;
  path: string;
  readOnly?: boolean;
  value?: string;
}

export const RestrictionField = ({ keyName, label, onChangeValue, path, readOnly, value }: IRestrictionFieldProps) => {

  const baseId = getDomFriendlyID(path);

  return (
    <>
      <Label>{label}</Label>
      <TextField
        id={`${baseId}-${keyName}-value`}
        value={value ?? ''}
        onChange={(e) => onChangeValue(path, e.target.value, keyName)}
        aria-label={label}
        readOnly={readOnly}
      />
    </>
  );
};
