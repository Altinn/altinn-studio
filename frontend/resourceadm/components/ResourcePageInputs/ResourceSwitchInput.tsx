import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Label, Paragraph, Switch } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

type ResourceSwitchInputProps = {
  /**
   * The label of the switch
   */
  label: string;
  /**
   * The description of the switch
   */
  description: string;
  /**
   * The value in the switch
   */
  value: boolean;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Function to be executed on change
   * @param isChecked the value used in the switch
   * @returns void
   */
  onChange: (isChecked: boolean) => void;
  /**
   * The id of the field
   */
  id: string;
  /**
   * The id of the description of the field
   */
  descriptionId: string;
  /**
   * The translation key to be put inside the translation function
   */
  toggleTextTranslationKey: string;
};

/**
 * @component
 *    Displays tge switch component used on the about resource page
 *
 * @property {string}[label] - The label of the switch
 * @property {string}[description] - The description of the switch
 * @property {string}[value] - The value in the switch
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {function}[onChange] - Function to be executed on change
 * @property {string}[id] - The id of the field
 * @property {string}[descriptionId] - The id of the description of the field
 * @property {string}[toggleTextTranslationKey] - The translation key to be put inside the translation function
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceSwitchInput = ({
  label,
  description,
  value,
  onFocus,
  onChange,
  id,
  descriptionId,
  toggleTextTranslationKey,
}: ResourceSwitchInputProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [isChecked, setIsChecked] = useState(value);

  return (
    <div className={classes.inputWrapper}>
      <Label size='small' spacing>
        {label}
      </Label>
      <Paragraph short size='small' className={classes.description} id={descriptionId}>
        {description}
      </Paragraph>
      <div className={classes.toggleWrapper}>
        <Switch
          checked={isChecked}
          onChange={(event) => {
            const newValue = event.target.checked;
            setIsChecked(newValue);
            onChange(newValue);
          }}
          onFocus={onFocus}
          id={id}
          aria-describedby={descriptionId}
          aria-label={label}
          size='small'
        >
          <Paragraph
            size='small'
            className={isChecked ? classes.toggleTextActive : classes.toggleTextInactive}
          >
            {t(toggleTextTranslationKey, {
              shouldText: isChecked
                ? t('resourceadm.switch_should')
                : t('resourceadm.switch_should_not'),
            })}
          </Paragraph>
        </Switch>
      </div>
    </div>
  );
};
