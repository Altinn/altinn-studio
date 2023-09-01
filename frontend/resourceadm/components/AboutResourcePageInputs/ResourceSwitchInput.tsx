import React, { useState } from 'react';
import classes from './AboutResourcePageInputs.module.css';
import { Label, Paragraph } from '@digdir/design-system-react';
import { Switch } from '../Switch';
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
   * The translation key to be put inside the translation function
   */
  toggleTextTranslationKey: string;
};

export const ResourceSwitchInput = ({
  label,
  description,
  value,
  onFocus,
  onBlur,
  id,
  toggleTextTranslationKey,
}: ResourceSwitchInputProps) => {
  const { t } = useTranslation();

  const [isChecked, setIsChecked] = useState(value);

  return (
    <>
      <div className={classes.divider} />
      <Label size='medium' spacing>
        {label}
      </Label>
      <Paragraph short size='small'>
        {description}
      </Paragraph>
      <div className={classes.inputWrapper}>
        <Switch
          isChecked={isChecked}
          onToggle={(b: boolean) => setIsChecked(b)}
          onFocus={onFocus}
          onBlur={() => onBlur(isChecked)}
          id={id}
        />
        <p className={isChecked ? classes.toggleTextActive : classes.toggleTextInactive}>
          {t(toggleTextTranslationKey, {
            showText: isChecked
              ? t('resourceadm.switch_should')
              : t('resourceadm.switch_should_not'),
          })}
        </p>
      </div>
    </>
  );
};
