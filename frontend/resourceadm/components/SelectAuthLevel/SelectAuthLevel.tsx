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
  value: RequiredAuthLevelType;
  setValue: (v: RequiredAuthLevelType) => void;
}

/**
 * Select component for selecting the authentication level of the end user
 *
 * @param props.value the value selected
 * @param props.setValue function that sets the value selected
 */
export const SelectAuthLevel = ({ value, setValue }: Props) => {
  return (
    <Select
      options={authlevelOptions}
      onChange={(v: RequiredAuthLevelType) => setValue(v)}
      value={value}
    />
  );
};
