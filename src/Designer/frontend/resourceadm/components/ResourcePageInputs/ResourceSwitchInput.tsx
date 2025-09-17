import React from 'react';
import classes from './ResourcePageInputs.module.css';
import { StudioParagraph, StudioSwitch, StudioFieldset } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ResourceSwitchInputProps = {
  /**
   * The field id, used by ErrorSummary
   */
  id: string;
  /**
   * The label of the switch
   */
  label: string;
  /**
   * The description of the switch
   */
  description?: string;
  /**
   * The value in the switch
   */
  value: boolean;
  /**
   * Function to be executed on change
   * @param isChecked the value used in the switch
   * @returns void
   */
  onChange: (isChecked: boolean) => void;
  /**
   * The translation key to be put inside the translation function
   */
  toggleTextTranslationKey: string;
};

/**
 * @component
 *    Displays the switch component used on the about resource page
 *
 * @property {string}[id] - The field id, used by ErrorSummary
 * @property {string}[label] - The label of the switch
 * @property {string}[description] - The description of the switch
 * @property {boolean}[value] - The value in the switch
 * @property {function}[onChange] - Function to be executed on change
 * @property {string}[toggleTextTranslationKey] - The translation key to be put inside the translation function
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceSwitchInput = ({
  id,
  label,
  description,
  value,
  onChange,
  toggleTextTranslationKey,
}: ResourceSwitchInputProps): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={classes.inputWrapper}>
      <StudioFieldset legend={label} description={description}>
        <div className={classes.toggleWrapper}>
          <StudioSwitch
            checked={value}
            onChange={(event) => {
              const newValue = event.target.checked;
              onChange(newValue);
            }}
            id={id}
            aria-description={description}
            label={
              <StudioParagraph
                className={value ? classes.toggleTextActive : classes.toggleTextInactive}
              >
                {t(toggleTextTranslationKey, {
                  shouldText: !value ? t('resourceadm.switch_should_not') : '',
                })}
              </StudioParagraph>
            }
            data-color='success'
          />
        </div>
      </StudioFieldset>
    </div>
  );
};
