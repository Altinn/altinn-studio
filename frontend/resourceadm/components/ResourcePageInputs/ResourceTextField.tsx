import type { KeyboardEvent } from 'react';
import React, { useState, forwardRef } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Textfield } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';

type ResourceTextFieldProps = {
  /**
   * The label of the text field
   */
  label: string;
  /**
   * The description of the text field
   */
  description: string;
  /**
   * The value in the field
   */
  value: string;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * The id of the field
   */
  id: string;
  /**
   * Flag for if the value is valid
   */
  isValid?: boolean;
  /**
   * Function to be executed on key down
   */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>, value: string) => void;
  /**
   * Function to be executed on blur
   * @param value the value used in the field
   * @returns void
   */
  onBlur: (value: string) => void;
  /**
   * Flag for if the error message should be shown
   */
  showErrorMessage?: boolean;
  /**
   * The text to be shown
   */
  errorText?: string;
};

/**
 * @component
 *    Displays an input textfield for a resource variable that has language support.
 *
 * @property {string}[label] - The label of the text field
 * @property {string}[description] - The description of the text field
 * @property {string}[value] - The value in the field
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {string}[id] - The id of the field
 * @property {boolean}[isValid] - Flag for if the value is valid
 * @property {function}[onKeyDown] - Function to be executed on key down
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[showErrorMessage] - Flag for if the error message should be shown
 * @property {string}[errorText] - The text to be shown
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceTextField = forwardRef<HTMLInputElement, ResourceTextFieldProps>(
  (
    {
      label,
      description,
      value,
      onFocus,
      id,
      isValid = true,
      onKeyDown,
      onBlur,
      showErrorMessage = false,
      errorText,
    },
    ref,
  ): React.JSX.Element => {
    const [val, setVal] = useState(value);

    return (
      <>
        <div className={classes.divider} />
        <div className={classes.inputWrapper}>
          <Textfield
            label={label}
            description={description}
            size='small'
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
            }}
            onFocus={onFocus}
            error={!isValid}
            ref={ref}
            onKeyDown={(e) => (onKeyDown ? onKeyDown(e, val) : undefined)}
            onBlur={() => onBlur(val)}
          />
          {showErrorMessage && <InputFieldErrorMessage message={errorText} />}
        </div>
      </>
    );
  },
);

ResourceTextField.displayName = 'ResourceTextField';
