import React, { useState } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Label, Paragraph, Switch } from '@digdir/design-system-react';
// import { Switch } from '../Switch';
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
   * Function to be executed on blur
   * @param isChecked the value used in the switch
   * @returns void
   */
  onBlur: (isChecked: boolean) => void;
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
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {string}[id] - The id of the field
 * @property {string}[descriptionId] - The id of the description of the field
 * @property {string}[toggleTextTranslationKey] - The translation key to be put inside the translation function
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceSwitchInput = ({
  label,
  description,
  value,
  onFocus,
  onBlur,
  id,
  descriptionId,
  toggleTextTranslationKey,
}: ResourceSwitchInputProps): React.ReactNode => {
  const { t } = useTranslation();

  const [isChecked, setIsChecked] = useState(value);

  return (
    <>
      <div className={classes.divider} />
      <Label size='small' spacing htmlFor={id}>
        {label}
      </Label>
      <div className={classes.inputWrapper}>
        <Paragraph short size='small' className={classes.description} id={descriptionId}>
          {description}
        </Paragraph>
        <Switch
          checked={isChecked}
          onChange={() => setIsChecked((b: boolean) => !b)}
          onFocus={onFocus}
          onBlur={() => onBlur(isChecked)}
          id={id}
          aria-describedby={descriptionId}
          size='small'
        />
        <Paragraph
          size='small'
          className={isChecked ? classes.toggleTextActive : classes.toggleTextInactive}
        >
          {t(toggleTextTranslationKey, {
            showText: isChecked
              ? t('resourceadm.switch_should')
              : t('resourceadm.switch_should_not'),
          })}
        </Paragraph>
      </div>
    </>
  );
};
