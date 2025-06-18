import React, { useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  StudioTextfield,
  StudioDetails,
  StudioCard,
  StudioTag,
  StudioValidationMessage,
} from '@studio/components';
import classes from './TranslationDetails.module.css';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import type { ValidLanguage } from 'app-shared/types/ResourceAdm';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import {
  getErrorMessagesForLanguage,
  getTextfieldRows,
  mapLanguageKeyToLanguageText,
} from '../../../utils/appConfigLanguageUtils';
import { getMissingInputLanguageString } from '../../../utils/appConfigValidationUtils';
import cn from 'classnames';

type SharedFieldProps = {
  lang: ValidLanguage;
  label: string;
  value: string;
  error?: string[];
};

export type TranslationDetailsProps = {
  label: string;
  isTextArea?: boolean;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  required?: boolean;
  tagText?: string;
  errors: AppConfigFormError[];
  id: string;
};

export function TranslationDetails({
  label,
  isTextArea = false,
  value,
  onChange,
  required = false,
  tagText,
  errors,
  id,
}: TranslationDetailsProps): ReactElement {
  const { t } = useTranslation();

  const translationValues: SupportedLanguage = {
    nb: value?.nb ?? '',
    nn: value?.nn ?? '',
    en: value?.en ?? '',
  };

  const errorMessage: string = getMissingInputLanguageString(
    { nb: translationValues.nb, nn: translationValues.nn, en: translationValues.en },
    id,
    t,
  );
  const hasErrors: boolean = !!errorMessage && errors.length > 0;
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (hasErrors && !open) {
      setOpen(true);
    }
  }, [hasErrors, open]);

  const tagColor: string = required ? 'warning' : 'info';
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
      value: translationValues['nn'],
      error: errorMessageNN,
    },
    {
      lang: 'en',
      label: fieldLabelEN,
      value: translationValues['en'],
      error: errorMessageEN,
    },
  ];

  const handleChange = (lang: ValidLanguage, newValue: string): void => {
    onChange({ ...translationValues, [lang]: newValue });
  };

  const handleToggle = (): void => {
    setOpen((prevOpen) => !prevOpen);
  };

  return (
    <>
      <StudioCard data-color='neutral' className={cn(classes.card, hasErrors && classes.cardError)}>
        <StudioDetails open={open} onToggle={handleToggle}>
          <StudioDetails.Summary>
            {t('app_settings.about_tab_language_translation_header', { field: label })}
            <StudioTag data-color={tagColor}>{tagText}</StudioTag>
          </StudioDetails.Summary>
          <StudioDetails.Content className={classes.content}>
            {translationFields.map(({ lang, label: fieldLabel, value: fieldValue, error }) => (
              <StudioTextfield
                key={lang}
                label={fieldLabel}
                value={fieldValue}
                multiple={isTextArea}
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
          </StudioDetails.Content>
        </StudioDetails>
      </StudioCard>
      {errorMessage && hasErrors && (
        <StudioValidationMessage>{errorMessage}</StudioValidationMessage>
      )}
    </>
  );
}
