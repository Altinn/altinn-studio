import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Radio } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';

type ResourceRadioGroupProps = {
  /**
   * Flag for if the component has spacing at the top
   */
  spacingTop?: boolean;
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
};

/**
 * @component
 *    Displays a dropdown component used on the about resource page
 *
 * @property {boolean}[spacingTop] - Flag for if the component has spacing at the top
 * @property {string}[label] - The label of the dropdown
 * @property {string}[description] - The description of the dropdown
 * @property {string}[value] - The value selected
 * @property {{value: string, lable: string}[]}[options] - List of the options in the dropdown
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {boolean}[hasError] - If the dropdown has an error
 * @property {function}[onChange] - Function to be executed on change
 * @property {string}[errorText] - The error text to be shown
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceRadioGroup = ({
  spacingTop = false,
  label,
  description,
  value,
  options,
  hasError = false,
  onFocus,
  onChange,
  errorText,
}: ResourceRadioGroupProps): React.JSX.Element => {
  const [selected, setSelected] = useState(value);

  const error = hasError && (selected === null || selected === undefined);

  return (
    <>
      {spacingTop && <div className={classes.divider} />}
      <div className={classes.inputWrapper}>
        <Radio.Group
          size='small'
          onChange={(val: string) => {
            setSelected(val);
            onChange(val);
          }}
          value={selected}
          legend={label}
          description={description}
          onFocus={onFocus}
          error={error ? <InputFieldErrorMessage message={errorText} /> : undefined}
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
    </>
  );
};
