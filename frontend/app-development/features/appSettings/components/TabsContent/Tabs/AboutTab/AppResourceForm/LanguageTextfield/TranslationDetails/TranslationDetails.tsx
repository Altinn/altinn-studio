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
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import {
  getErrorMessagesForLanguage,
  getTextfieldRows,
  mapLanguageKeyToLanguageText,
} from '../../../utils/appResourceLanguageUtils';
import { getMissingInputLanguageString } from '../../../utils/appResourceValidationUtils';
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
  errors: AppResourceFormError[];
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

  const errorMessage: string = getMissingInputLanguageString(
    { nb: value.nb, nn: value.nn, en: value.en },
    t('app_settings.about_tab_error_usage_string_service_name'),
    t,
  );
  const hasErrors: boolean = errorMessage && errors.length > 0;
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (hasErrors && !open) {
      setOpen(true);
    }
  }, [hasErrors, open]);

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

  const handleToggle = (): void => {
    setOpen((prevOpen) => !prevOpen);
  };

  return (
    <>
      <StudioCard data-color='neutral' className={cn(classes.card, hasErrors && classes.cardError)}>
        <StudioDetails open={open} onToggle={handleToggle}>
          <StudioDetails.Summary>
            {t('app_settings.about_tab_language_translation_header', { field: label })}
            <StudioTag data-color='warning'>{tagText}</StudioTag>
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
