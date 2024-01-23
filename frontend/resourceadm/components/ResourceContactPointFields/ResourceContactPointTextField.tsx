import React from 'react';
import { Textfield } from '@digdir/design-system-react';

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
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Function to execute on change
   * @param value the value typed
   * @returns void
   */
  onChange: (value: string) => void;
  /**
   * Function to be executed on blur
   * @param value the value of the field
   * @returns void
   */
  onBlur: () => void;
  /**
   * If the field is valid
   */
  isValid: boolean;
};

/**
 * @component
 *    Textfield inside the contact point group
 *
 * @property {string}[label] - The label of the field
 * @property {string}[value] - The value in the field
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {function}[onChange] - Function to execute on change
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[isValid] - If the field is valid
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceContactPointTextField = ({
  label,
  value,
  onFocus,
  onChange,
  onBlur,
  isValid,
}: ResourceContactPointTextFieldProps): React.JSX.Element => {
  return (
    <div>
      <Textfield
        label={label}
        size='small'
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur()}
        error={!isValid}
      />
    </div>
  );
};
