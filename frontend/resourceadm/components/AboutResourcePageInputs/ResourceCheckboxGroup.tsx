import React from 'react';
import classes from './AboutResourcePageInputs.module.css';
import { Checkbox, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { InputFieldErrorMessage } from './InputFieldErrorMessage';

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
   * Fucntion to execute on change
   * @param val the values selected
   * @returns void
   */
  onChange: (val: string[]) => void;
  /**
   * The selected options
   */
  value: string[];
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
 * @property {string[]}[value] - The selected options
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceCheckboxGroup = ({
  options,
  legend,
  description,
  showErrors,
  onChange,
  value,
}: ResourceCheckboxGroupProps): React.ReactNode => {
  const { t } = useTranslation();

  const displayAvailableForCheckboxes = () => {
    return options.map((option) => (
      <Checkbox value={option.value} key={option.value} size='small'>
        {t(option.label)}
      </Checkbox>
    ));
  };

  return (
    <>
      <div className={classes.divider} />
      <div className={classes.inputWrapper}>
        <Checkbox.Group
          legend={legend}
          error={showErrors && value.length === 0}
          onChange={onChange}
          value={value}
        >
          <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
            {description}
          </Paragraph>
          {displayAvailableForCheckboxes()}
        </Checkbox.Group>
      </div>
      {showErrors && (
        <InputFieldErrorMessage
          message={t('resourceadm.about_resource_available_for_error_message')}
        />
      )}
    </>
  );
};
