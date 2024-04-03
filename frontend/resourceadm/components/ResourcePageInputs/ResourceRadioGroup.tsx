import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Radio } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';
import { ResourceFieldHeader } from './ResourceFieldHeader';

type ResourceRadioGroupProps = {
  /**
   * The label of the dropdown
   */
  label: string;
  /**
   * The description of the dropdown
   */
  description: string;
  /**
   * The value selected
   */
  value: string;
  /**
   * List of the options in the dropdown
   */
  options: { value: string; label: string }[];
  /**
   * If the dropdown has an error
   */
  hasError?: boolean;
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
   * The error text to be shown
   */
  errorText?: string;
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
 * @property {boolean}[hasError] - If the dropdown has an error
 * @property {function}[onChange] - Function to be executed on change
 * @property {string}[errorText] - The error text to be shown
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceRadioGroup = ({
  label,
  description,
  value,
  options,
  hasError = false,
  onFocus,
  onChange,
  errorText,
  required,
}: ResourceRadioGroupProps): React.JSX.Element => {
  const [selected, setSelected] = useState(value);

  const error = hasError && (selected === null || selected === undefined);

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
        error={error ? <InputFieldErrorMessage message={errorText} /> : undefined}
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
