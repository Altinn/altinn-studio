import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Label, Paragraph, Select } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';

type ResourceDropdownProps = {
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
   * Function to be executed on blur
   * @param selected the value selected
   * @returns void
   */
  onBlur: (selected: string) => void;
  /**
   * The id of the field
   */
  id: string;
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
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {string}[id] - The id of the field
 * @property {string}[errorText] - The error text to be shown
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDropdown = ({
  spacingTop = false,
  label,
  description,
  value,
  options,
  hasError = false,
  onFocus,
  onBlur,
  id,
  errorText,
}: ResourceDropdownProps): React.ReactNode => {
  const [selected, setSelected] = useState(value);

  const handleChangeInput = (val: string) => {
    setSelected(val);
  };

  const error = hasError && (selected === null || selected === undefined);

  return (
    <>
      {spacingTop && <div className={classes.divider} />}
      <Label size='medium' spacing htmlFor={id}>
        {label}
      </Label>
      <Paragraph short size='small'>
        {description}
      </Paragraph>
      <div className={classes.inputWrapper}>
        <Select
          options={options}
          onChange={handleChangeInput}
          value={selected}
          onFocus={onFocus}
          error={error}
          onBlur={() => onBlur(selected)}
          inputId={id}
        />
        {error && <InputFieldErrorMessage message={errorText} />}
      </div>
    </>
  );
};
