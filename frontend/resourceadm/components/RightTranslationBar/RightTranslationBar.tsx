import React from 'react';
import classes from './RightTranslationBar.module.css';
import { GlobeIcon } from '@studio/icons';
import {
  StudioTextfield,
  StudioAlert,
  StudioParagraph,
  StudioHeading,
  StudioTextarea,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { mapLanguageKeyToLanguageText } from '../../utils/resourceUtils';
import type {
  ResourceFormError,
  SupportedLanguage,
  ValidLanguage,
} from 'app-shared/types/ResourceAdm';
import { ResourceFieldHeader } from '../ResourcePageInputs/ResourceFieldHeader';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

export type RightTranslationBarProps = {
  title: string;
  usesTextArea?: boolean;
  value: SupportedLanguage;
  onLanguageChange: (value: SupportedLanguage) => void;
  errors: ResourceFormError[];
  onBlur: () => void;
  required?: boolean;
};

/**
 * @component
 * @example
 *    <RightTranslationBar
 *      title='Navn på tjenesten'
 *      value={title}
 *      onChange={(value: LanguageString) => setTitle(value)}
 *      errors
 *      showAlert
 *    />
 *
 * @property {string}[title] - The title of the selected inputfield
 * @property {boolean}[usesTextArea] - Optional Boolean flag to decide if a text area should be used instead of a text field
 * @property {SupportedLanguage}[value] - The value to display in the input field
 * @property {(value: LanguageString) => void}[onLanguageChange] - Function that updates the value when changes are made in the input field.
 * @property {ResourceFormError[]}[errors] - Error messages
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const RightTranslationBar = ({
  title,
  usesTextArea = false,
  value,
  onLanguageChange,
  errors,
  onBlur,
  required,
}: RightTranslationBarProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (lang: ValidLanguage, val: string) => {
    onLanguageChange({ ...value, [lang]: val });
  };

  const displayNField = (lang: ValidLanguage) => {
    const label = `${title} (${mapLanguageKeyToLanguageText(lang, t)})`;

    const errorMessages = errors
      .filter((error) => error.index === lang)
      .map((error, index) => <InputFieldErrorMessage key={index} message={error.error} />);
    const errorMessagesToDisplay = errorMessages.length > 0 ? errorMessages : undefined;

    if (usesTextArea) {
      return (
        <StudioTextarea
          value={value[lang]}
          onChange={(e) => handleChange(lang, e.currentTarget.value)}
          rows={5}
          label={<ResourceFieldHeader label={label} required={required} />}
          error={errorMessagesToDisplay}
          onBlur={onBlur}
          required={required}
        />
      );
    }
    return (
      <StudioTextfield
        value={value[lang]}
        onChange={(e) => handleChange(lang, e.target.value)}
        label={<ResourceFieldHeader label={label} required={required} />}
        error={errorMessagesToDisplay}
        onBlur={onBlur}
        required={required}
      />
    );
  };

  return (
    <div className={classes.rightWrapper}>
      <div className={classes.wrapper}>
        <div className={classes.topWrapper}>
          <GlobeIcon
            title={t('resourceadm.right_translation_bar_translation')}
            className={classes.icon}
          />
          <StudioHeading size='xs' level={2}>
            {t('resourceadm.right_translation_bar_title')}
          </StudioHeading>
        </div>
        <StudioAlert severity='info'>
          <StudioParagraph size='sm'>
            {t('resourceadm.right_translation_bar_alert')}
          </StudioParagraph>
        </StudioAlert>
        <div className={classes.inputWrapper}>{displayNField('nn')}</div>
        <div className={classes.inputWrapper}>{displayNField('en')}</div>
      </div>
    </div>
  );
};
