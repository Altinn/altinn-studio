import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioAlert, StudioHeading, StudioParagraph, StudioTextfield } from '@studio/components';
import classes from './TranslationBox.module.css';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import type { ValidLanguage } from 'app-shared/types/ResourceAdm';
import { GlobeIcon } from '@studio/icons';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import {
  getErrorMessagesForLanguage,
  mapLanguageKeyToLanguageText,
} from '../../../utils/appResourceLanguageUtils';

type TranslationBoxProps = {
  label: string;
  isTextArea?: boolean;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  required?: boolean;
  tagText?: string;
  errors: AppResourceFormError[];
};

export function TranslationBox({
  label,
  isTextArea = false,
  value,
  onChange,
  required = false,
  tagText,
  errors,
}: TranslationBoxProps): ReactElement {
  const { t } = useTranslation();

  const handleChange = (lang: ValidLanguage, newValue: string): void => {
    onChange({ ...value, [lang]: newValue });
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.translationBox}>
        <div className={classes.headingWrapper}>
          <GlobeIcon className={classes.icon} />
          <StudioHeading data-size='xs' level={4}>
            {t('app_settings.about_tab_language_translation_header')}
          </StudioHeading>
        </div>
        <StudioAlert data-color='info'>
          <StudioParagraph>{t('app_settings.about_tab_translation_box_alert')}</StudioParagraph>
        </StudioAlert>
        <Textfield
          label={label}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange('nn', e.target.value)
          }
          isTextArea={isTextArea}
          required={required}
          tagText={tagText}
          language='nn'
          errors={errors}
        />
        <Textfield
          label={label}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange('en', e.target.value)
          }
          isTextArea={isTextArea}
          required={required}
          tagText={tagText}
          language='en'
          errors={errors}
        />
      </div>
    </div>
  );
}

type TextfieldProps = {
  label: string;
  value: SupportedLanguage;
  onChange: (value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextArea?: boolean;
  required?: boolean;
  tagText?: string;
  language: ValidLanguage;
  errors?: AppResourceFormError[];
};

function Textfield({
  label,
  value,
  onChange,
  isTextArea = false,
  required = false,
  tagText,
  language,
  errors,
}: TextfieldProps): ReactElement {
  const { t } = useTranslation();

  const languageText: string = mapLanguageKeyToLanguageText(language, t);
  const fieldLabel: string = `${label} (${languageText})`;

  const errorMessage: string[] | undefined = getErrorMessagesForLanguage(errors, language);
  return (
    <StudioTextfield
      label={fieldLabel}
      value={value[language]}
      multiple={isTextArea}
      className={classes.textField}
      onChange={onChange}
      required={required}
      tagText={tagText}
      rows={isTextArea ? 5 : undefined}
      error={errorMessage}
    />
  );
}
