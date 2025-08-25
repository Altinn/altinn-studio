import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import {
  StudioRadio,
  StudioRadioGroup,
  StudioValidationMessage,
  useStudioRadioGroup,
} from '@studio/components';
import { ResourceFieldHeader } from './ResourceFieldHeader';
import type { ResourceFormError } from 'app-shared/types/ResourceAdm';

type ResourceRadioGroupProps = {
  /**
   * The field id, used by ErrorSummary
   */
  id: string;
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
 * @property {string}[id] - The field id, used by ErrorSummary
 * @property {string}[label] - The label of the dropdown
 * @property {string}[description] - The description of the dropdown
 * @property {string}[value] - The value selected
 * @property {{value: string, lable: string}[]}[options] - List of the options in the dropdown
 * @property {function}[onChange] - Function to be executed on change
 * @property {ResourceFormError[]}[errors] - The error texts to be shown
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceRadioGroup = ({
  id,
  label,
  description,
  value,
  options,
  onChange,
  errors,
  required,
}: ResourceRadioGroupProps): React.JSX.Element => {
  const [selected, setSelected] = useState(value);

  const { getRadioProps } = useStudioRadioGroup({
    value: selected,
    error: errors.length > 0,
    onChange: (newValue: string) => {
      setSelected(newValue);
      onChange(newValue);
    },
  });

  return (
    <div className={classes.inputWrapper}>
      <StudioRadioGroup
        id={id}
        data-size='md'
        legend={<ResourceFieldHeader label={label} required={required} />}
        description={description}
        required={required}
      >
        {options.map((opt) => {
          return (
            <StudioRadio
              key={opt.value}
              label={opt.label}
              {...getRadioProps({ value: opt.value })}
            />
          );
        })}
        {errors.length > 0 &&
          errors.map((error, index) => (
            <StudioValidationMessage key={index} data-color='danger'>
              {error.error}
            </StudioValidationMessage>
          ))}
      </StudioRadioGroup>
    </div>
  );
};
