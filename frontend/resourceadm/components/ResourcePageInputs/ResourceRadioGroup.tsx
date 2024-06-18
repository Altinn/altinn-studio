import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Radio } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';
import { ResourceFieldHeader } from './ResourceFieldHeader';
import type { ResourceFormError } from 'app-shared/types/ResourceAdm';

type ResourceRadioGroupProps = {
  /**
   * The label of the dropdown
   */
  label: string;
  /**
   * The description of the dropdown
   */
  description?: string;
  /**
   * The value selected
   */
  value: string;
  /**
   * List of the options in the dropdown
   */
  options: { value: string; label: string }[];
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Function to be executed on change
   * @param selected the value selected
   * @returns void
   */
  onChange: (selected: string) => void;
  /**
   * The error texts to be shown
   */
  errors?: ResourceFormError[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
};

/**
 * @component
 *    Displays a dropdown component used on the about resource page
 *
 * @property {string}[label] - The label of the dropdown
 * @property {string}[description] - The description of the dropdown
 * @property {string}[value] - The value selected
 * @property {{value: string, lable: string}[]}[options] - List of the options in the dropdown
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {function}[onChange] - Function to be executed on change
 * @property {ResourceFormError[]}[errors] - The error texts to be shown
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceRadioGroup = ({
  label,
  description,
  value,
  options,
  onFocus,
  onChange,
  errors,
  required,
}: ResourceRadioGroupProps): React.JSX.Element => {
  const [selected, setSelected] = useState(value);

  return (
    <div className={classes.inputWrapper}>
      <Radio.Group
        size='small'
        onChange={(val: string) => {
          setSelected(val);
          onChange(val);
        }}
        value={selected}
        legend={<ResourceFieldHeader label={label} required={required} />}
        description={description}
        onFocus={onFocus}
        error={
          errors.length > 0
            ? errors.map((error, index) => (
                <InputFieldErrorMessage key={index} message={error.error} />
              ))
            : undefined
        }
        required={required}
      >
        {options.map((opt) => {
          return (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          );
        })}
      </Radio.Group>
    </div>
  );
};
