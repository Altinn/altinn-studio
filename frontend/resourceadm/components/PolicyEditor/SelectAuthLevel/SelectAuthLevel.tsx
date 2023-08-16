import React from 'react';
import { Select } from '@digdir/design-system-react';
import { RequiredAuthLevelType } from 'resourceadm/types/global';

const authlevelOptions = [
  { value: '0', label: '0 - Selvidentifisert bruker Altinn(brukervavn/passord)' },
  { value: '3', label: '3 - MinID' },
  { value: '4', label: '4 - BankID, Buypass' },
];

interface Props {
  /**
   * The value selected
   */
  value: RequiredAuthLevelType;
  /**
   * Function that sets the value selected
   * @param v the value
   * @returns void
   */
  setValue: (v: RequiredAuthLevelType) => void;
  /**
   * Hidden form label for the input field
   */
  label: string;
}

/**
 * @component
 *    Select component for selecting the authentication level of the end user
 *
 * @property {RequiredAuthLevelType}[value] - The value selected
 * @property {function}[setValue] - Function that sets the value selected
 * @property {string}[label] - Hidden form label for the input field
 */
export const SelectAuthLevel = ({ value, setValue, label }: Props) => {
  return (
    <Select
      options={authlevelOptions}
      onChange={(v: RequiredAuthLevelType) => setValue(v)}
      value={value}
      label={label}
    />
  );
};
