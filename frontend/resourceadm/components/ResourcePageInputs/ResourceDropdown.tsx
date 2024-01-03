import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Label, Combobox, Paragraph } from '@digdir/design-system-react';
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
  errorText,
}: ResourceDropdownProps): React.ReactNode => {
  const [selected, setSelected] = useState(value);

  const handleChangeInput = (val: string) => {
    if (val) {
      setSelected(val);
    }
  };

  const error = hasError && (selected === null || selected === undefined);

  return (
    <>
      {spacingTop && <div className={classes.divider} />}
      <Label size='small' spacing>
        {label}
      </Label>
      <Paragraph short size='small'>
        {description}
      </Paragraph>
      <div className={classes.inputWrapper}>
        <Combobox
          size='small'
          hideLabel
          label={label}
          description={description}
          onValueChange={(newValue: string[]) => handleChangeInput(newValue[0])}
          value={selected ? [selected] : undefined}
          onFocus={onFocus}
          error={error}
          onBlur={() => onBlur(selected)}
        >
          {options.map((opt) => {
            return (
              <Combobox.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Combobox.Option>
            );
          })}
        </Combobox>
        {error && <InputFieldErrorMessage message={errorText} />}
      </div>
    </>
  );
};
