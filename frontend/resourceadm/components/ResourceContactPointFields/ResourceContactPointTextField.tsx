import React, { useState } from 'react';
import { TextField } from '@digdir/design-system-react';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

type ResourceContactPointTextFieldProps = {
  /**
   * The label of the field
   */
  label: string;
  /**
   * The value in the field
   */
  value: string;
  /**
   * Function to be executed on blur
   * @param value the value of the field
   * @returns void
   */
  onBlur: (value: string) => void;
  /**
   * If the potential errors should be shown
   */
  showErrors: boolean;
  /**
   * The message to be displayed on error
   */
  errorMessage: string;
};

/**
 * @component
 *    Textfield inside the contact point group
 *
 * @property {string}[label] - The label of the field
 * @property {string}[value] - The value in the field
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[showErrors] - If the potential errors should be shown
 * @property {string}[errorMessage] - The message to be displayed on error
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceContactPointTextField = ({
  label,
  value,
  onBlur,
  showErrors,
  errorMessage,
}: ResourceContactPointTextFieldProps): React.ReactNode => {
  const [val, setVal] = useState(value);

  return (
    <div>
      <TextField
        label={label}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => onBlur(val)}
        isValid={!(val === '' && showErrors)}
      />
      {showErrors && val === '' && <InputFieldErrorMessage message={errorMessage} />}
    </div>
  );
};
