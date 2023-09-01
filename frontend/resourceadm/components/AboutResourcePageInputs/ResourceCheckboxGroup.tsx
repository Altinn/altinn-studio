import React from 'react';
import classes from './AboutResourcePageInputs.module.css';
import { Checkbox, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

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
   * If the group has errors
   */
  error: boolean;
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
 * @property {boolean}[error] - If the group has errors
 * @property {function}[onChange] - Fucntion to execute on change
 * @property {string[]}[value] - The selected options
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceCheckboxGroup = ({
  options,
  legend,
  description,
  error,
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
        <Checkbox.Group legend={legend} error={error} onChange={onChange} value={value}>
          <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
            {description}
          </Paragraph>
          {displayAvailableForCheckboxes()}
        </Checkbox.Group>
      </div>
    </>
  );
};
