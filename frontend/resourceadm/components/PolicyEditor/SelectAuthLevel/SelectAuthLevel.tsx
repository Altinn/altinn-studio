import React from 'react';
import { Select } from '@digdir/design-system-react';
import { RequiredAuthLevelType } from 'resourceadm/types/global';

const authlevelOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
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
