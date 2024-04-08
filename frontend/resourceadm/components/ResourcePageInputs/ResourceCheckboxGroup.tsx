import React from 'react';
import classes from './ResourcePageInputs.module.css';
import { Checkbox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';
import { ResourceFieldHeader } from './ResourceFieldHeader';

type ResourceCheckboxGroupProps = {
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
   * If the errors should be shown
   */
  showErrors: boolean;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
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
 * @property {{value: string, label: string}[]}[options] - The options to display in the checkbox group
 * @property {string}[legend] - The legend of the group
 * @property {string}[description] - The description of the group
 * @property {boolean}[showErrors] - If the errors should be shown
 * @property {function}[onChange] - Fucntion to execute on change
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {string[]}[value] - The selected options
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceCheckboxGroup = ({
  options,
  legend,
  description,
  showErrors,
  onFocus,
  onChange,
  value,
  required,
}: ResourceCheckboxGroupProps): React.JSX.Element => {
  const { t } = useTranslation();

  const displayAvailableForCheckboxes = () => {
    return options.map((option) => (
      <Checkbox value={option.value} key={option.value} size='small'>
        {t(option.label)}
      </Checkbox>
    ));
  };

  return (
    <div className={classes.inputWrapper}>
      <Checkbox.Group
        legend={<ResourceFieldHeader label={legend} required={required} />}
        description={description}
        size='small'
        error={
          showErrors && value.length === 0 ? (
            <InputFieldErrorMessage
              message={t('resourceadm.about_resource_available_for_error_message')}
            />
          ) : undefined
        }
        onChange={onChange}
        onFocus={onFocus}
        value={value}
      >
        {displayAvailableForCheckboxes()}
      </Checkbox.Group>
    </div>
  );
};
