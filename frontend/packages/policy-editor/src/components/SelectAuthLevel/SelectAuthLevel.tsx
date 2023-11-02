import React from 'react';
import { Select } from '@digdir/design-system-react';
import type { RequiredAuthLevel } from '../../types';

export const authlevelOptions = [
  { value: '0', label: '0 - Selvidentifisert bruker Altinn(brukervavn/passord)' },
  { value: '3', label: '3 - MinID' },
  { value: '4', label: '4 - BankID, Buypass' },
];

export type SelectAuthLevelProps = {
  value: RequiredAuthLevel;
  setValue: (v: RequiredAuthLevel) => void;
  label: string;
};

/**
 * @component
 *    Select component for selecting the authentication level of the end user
 *
 * @property {RequiredAuthLevel}[value] - The value selected
 * @property {function}[setValue] - Function that sets the value selected
 * @property {string}[label] - Hidden form label for the input field
 */
export const SelectAuthLevel = ({ value, setValue, label }: SelectAuthLevelProps) => {
  return (
    <Select
      options={authlevelOptions}
      onChange={(v: RequiredAuthLevel) => setValue(v)}
      value={value}
      label={label}
    />
  );
};
