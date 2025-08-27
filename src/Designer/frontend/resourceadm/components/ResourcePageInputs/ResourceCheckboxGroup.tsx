import React from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioCheckbox } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';
import { ResourceFieldHeader } from './ResourceFieldHeader';
import type { ResourceFormError } from 'app-shared/types/ResourceAdm';

type ResourceCheckboxGroupProps = {
  /**
   * The field id, used by ErrorSummary
   */
  id: string;
  /**
   * The options to display in the checkbox group
   */
  options: { value: string; label: string }[];
  /**
   * The legend of the group
   */
  legend: string;
  /**
   * The description of the group
   */
  description: string;
  /**
   * Field errors
   */
  errors: ResourceFormError[];
  /**
   * Fucntion to execute on change
   * @param val the values selected
   * @returns void
   */
  onChange: (val: string[]) => void;
  /**
   * The selected options
   */
  value: string[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
};

/**
 * @component
 *    Displays the checkbox group in the about resource page
 *
 * @property {string}[id] - The field id, used by ErrorSummary
 * @property {{value: string, label: string}[]}[options] - The options to display in the checkbox group
 * @property {string}[legend] - The legend of the group
 * @property {string}[description] - The description of the group
 * @property {ResourceFormError[]}[errors] -  Field errors
 * @property {function}[onChange] - Fucntion to execute on change
 * @property {string[]}[value] - The selected options
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceCheckboxGroup = ({
  id,
  options,
  legend,
  description,
  errors,
  onChange,
  value,
  required,
}: ResourceCheckboxGroupProps): React.JSX.Element => {
  const { t } = useTranslation();

  const displayAvailableForCheckboxes = () => {
    return options.map((option) => (
      <StudioCheckbox value={option.value} key={option.value} size='sm'>
        {t(option.label)}
      </StudioCheckbox>
    ));
  };

  const fieldErrors = errors.map((error, index) => (
    <InputFieldErrorMessage key={index} message={error.error} />
  ));

  return (
    <div className={classes.inputWrapper}>
      <StudioCheckbox.Group
        id={id}
        legend={<ResourceFieldHeader label={legend} required={required} />}
        description={description}
        size='sm'
        error={fieldErrors.length > 0 ? fieldErrors : undefined}
        onChange={onChange}
        value={value}
      >
        {displayAvailableForCheckboxes()}
      </StudioCheckbox.Group>
    </div>
  );
};
