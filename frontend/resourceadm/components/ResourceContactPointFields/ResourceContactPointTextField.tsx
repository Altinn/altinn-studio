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
 * @property {function}[onChange] - Function to execute on change
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[isValid] - If the field is valid
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceContactPointTextField = ({
  label,
  value,
  onChange,
  onBlur,
  isValid,
}: ResourceContactPointTextFieldProps): React.ReactNode => {
  return (
    <div>
      <Textfield
        label={label}
        size='small'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur()}
        error={!isValid}
      />
    </div>
  );
};
