import React from 'react';
import { Select } from '@digdir/design-system-react';
import type { RequiredAuthLevel } from '../../types';

export const authlevelOptions = [
  { value: '0', label: '0 - Selvidentifisert bruker Altinn(brukervavn/passord)' },
  { value: '3', label: '3 - MinID' },
  { value: '4', label: '4 - BankID, Buypass' },
];

export type SelectAuthLevelProps = {
  /**
   * The value selected
   */
  value: RequiredAuthLevel;
  /**
   * Function that sets the value selected
   * @param v the value
   * @returns void
   */
  setValue: (v: RequiredAuthLevel) => void;
  /**
   * Hidden form label for the input field
   */
  label: string;
  /**
   * Function to be executed on blur
   * @returns
   */
  onBlur: () => void;
};

/**
 * @component
 *    Select component for selecting the authentication level of the end user
 *
 * @property {RequiredAuthLevel}[value] - The value selected
 * @property {function}[setValue] - Function that sets the value selected
 * @property {string}[label] - Hidden form label for the input field
 * @property {function}[onBlur] - Function to be executed on blur
 */
export const SelectAuthLevel = ({ value, setValue, label, onBlur }: SelectAuthLevelProps) => {
  return (
    <Select
      options={authlevelOptions}
      onChange={(v: RequiredAuthLevel) => setValue(v)}
      value={value}
      label={label}
      onBlur={onBlur}
    />
  );
};
