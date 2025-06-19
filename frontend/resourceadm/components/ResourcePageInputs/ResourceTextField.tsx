import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioTextfield } from '@studio/components';
import { ResourceFieldHeader } from './ResourceFieldHeader';

type ResourceTextFieldProps = {
  /**
   * The field id, used by ErrorSummary
   */
  id: string;
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
   * Function to be executed on blur
   * @param value the value used in the field
   * @returns void
   */
  onBlur: (value: string) => void;
  /**
   * Whether this field is required or not
   */
  required?: boolean;
  /**
   * Whether this field is read only or not
   */
  readOnly?: boolean;
};

/**
 * @component
 *    Displays an input textfield for a resource variable that has language support.
 *
 * @property {string}[id] - The field id, used by ErrorSummary
 * @property {string}[label] - The label of the text field
 * @property {string}[description] - The description of the text field
 * @property {string}[value] - The value in the field
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[required] - Whether this field is required or not
 * @property {boolean}[readOnly] - Whether this field is read only or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceTextField = ({
  id,
  label,
  description,
  value,
  onBlur,
  required,
  readOnly,
}: ResourceTextFieldProps): React.JSX.Element => {
  const [val, setVal] = useState(value);

  return (
    <div className={classes.inputWrapper}>
      <StudioTextfield
        id={id}
        label={<ResourceFieldHeader label={label} required={required} />}
        description={description}
        value={val}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setVal(e.target.value);
        }}
        onBlur={() => onBlur(val)}
        required={required}
        readOnly={readOnly}
      />
    </div>
  );
};
