import React from 'react';
import { Select } from '@digdir/design-system-react';
import { RequiredAuthLevelType } from '@altinn/policy-editor/src/types';

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
  /**
   * Function to be executed on blur
   * @returns
   */
  onBlur: () => void;
}

/**
 * @component
 *    Select component for selecting the authentication level of the end user
 *
 * @property {RequiredAuthLevelType}[value] - The value selected
 * @property {function}[setValue] - Function that sets the value selected
 * @property {string}[label] - Hidden form label for the input field
 * @property {function}[onBlur] - Function to be executed on blur
 */
export const SelectAuthLevel = ({ value, setValue, label, onBlur }: Props) => {
  return (
    <Select
      options={authlevelOptions}
      onChange={(v: RequiredAuthLevelType) => setValue(v)}
      value={value}
      label={label}
      onBlur={onBlur}
    />
  );
};
