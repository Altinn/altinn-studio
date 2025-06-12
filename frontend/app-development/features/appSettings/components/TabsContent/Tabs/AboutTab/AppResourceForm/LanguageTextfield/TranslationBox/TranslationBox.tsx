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
  getTextfieldRows,
  mapLanguageKeyToLanguageText,
} from '../../../utils/appResourceLanguageUtils';

type SharedFieldProps = {
  lang: ValidLanguage;
  label: string;
  value: string;
  error: string[];
};

export type TranslationBoxProps = {
  label: string;
  isTextArea?: boolean;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  required?: boolean;
  tagText?: string;
  errors: AppResourceFormError[];
  id: string;
};

export function TranslationBox({
  label,
  isTextArea = false,
  value,
  onChange,
  required = false,
  tagText,
  errors,
  id,
}: TranslationBoxProps): ReactElement {
  const { t } = useTranslation();

  const languageTextNN: string = mapLanguageKeyToLanguageText('nn', t);
  const languageTextEN: string = mapLanguageKeyToLanguageText('en', t);
  const fieldLabelNN: string = `${label} (${languageTextNN})`;
  const fieldLabelEN: string = `${label} (${languageTextEN})`;
  const errorMessageNN: string[] | undefined = getErrorMessagesForLanguage(errors, 'nn');
  const errorMessageEN: string[] | undefined = getErrorMessagesForLanguage(errors, 'en');

  const translationFields: SharedFieldProps[] = [
    {
      lang: 'nn',
      label: fieldLabelNN,
      value: value['nn'],
      error: errorMessageNN,
    },
    {
      lang: 'en',
      label: fieldLabelEN,
      value: value['en'],
      error: errorMessageEN,
    },
  ];

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
        {translationFields.map(({ lang, label: fieldLabel, value: fieldValue, error }) => (
          <StudioTextfield
            key={lang}
            label={fieldLabel}
            value={fieldValue}
            multiple={isTextArea}
            className={classes.textField}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              handleChange(lang, e.target.value)
            }
            required={required}
            tagText={tagText}
            rows={getTextfieldRows(isTextArea)}
            error={error}
            id={`${id}-${lang}`}
          />
        ))}
      </div>
    </div>
  );
}
